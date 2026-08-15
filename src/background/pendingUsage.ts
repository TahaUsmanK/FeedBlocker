/**
 * Pending usage buffer — write-through to chrome.storage.session so that
 * counts survive service worker termination (MV3 ephemeral SW pattern).
 *
 * Flow:
 *   addPendingSeconds  → updates in-memory cache AND chrome.storage.session
 *   flushPendingUsage  → reads chrome.storage.session (source of truth),
 *                         calls batchIncrementUsage (single atomic write),
 *                         then clears the session buffer
 *   recoverPending     → called on SW boot; flushes any leftover session data
 *                         from a previously-killed worker before resuming
 */
import { emptyPlatformRecord } from '../lib/limits';
import { StorageService } from '../storage';
import { Platform, TRACKED_PLATFORMS } from '../types';

const SESSION_KEY = 'pendingUsage';

/** In-memory shadow of the session buffer — avoids an extra async read each heartbeat */
let memory: Record<Platform, number> = emptyPlatformRecord(0);

/** In-flight flush promise to prevent concurrent duplicate flushes */
let flushPromise: Promise<void> | null = null;

/** Write the current in-memory totals to chrome.storage.session (fire-and-forget) */
function persistToSession(): void {
    chrome.storage.session.set({ [SESSION_KEY]: { ...memory } }).catch(() => {/* ignore */ });
}

/** Read the session buffer (handles missing key gracefully) */
async function readFromSession(): Promise<Record<Platform, number>> {
    try {
        const result = await chrome.storage.session.get(SESSION_KEY);
        const stored = result[SESSION_KEY] as Record<Platform, number> | undefined;
        if (!stored) return emptyPlatformRecord(0);
        return { ...emptyPlatformRecord(0), ...stored };
    } catch {
        return emptyPlatformRecord(0);
    }
}

/** Clear the session buffer */
async function clearSession(): Promise<void> {
    try {
        await chrome.storage.session.remove(SESSION_KEY);
    } catch {
        /* ignore */
    }
}

/**
 * Called on every HEARTBEAT from the content script.
 * Increments both the in-memory shadow AND the session-storage buffer so that
 * the data survives if Chrome kills the service worker before the next flush.
 */
export function addPendingSeconds(platform: Platform, seconds: number): void {
    memory[platform] = (memory[platform] || 0) + seconds;
    persistToSession();
}

/** Get the current pending seconds for a platform that haven't been flushed yet */
export function getPendingSeconds(platform: Platform): number {
    return memory[platform] || 0;
}

async function doFlush(): Promise<void> {
    // Read whatever was saved in session storage
    const sessionData = await readFromSession();

    // Use Math.max, not sum: session storage is a near-exact mirror of memory
    // (persisted on every heartbeat), so summing would double-count.
    // On a cold SW boot, memory is 0 and sessionData has the real value.
    // On a warm flush, memory has the real value and sessionData may lag slightly.
    const delta = emptyPlatformRecord(0);
    for (const p of TRACKED_PLATFORMS) {
        delta[p] = Math.max(sessionData[p] || 0, memory[p] || 0);
        memory[p] = 0;
    }

    // Clear session storage immediately so any new heartbeats write fresh counts
    await clearSession();

    const hasData = TRACKED_PLATFORMS.some((p) => delta[p] > 0);
    if (!hasData) return;

    // Apply the batch atomically to durable local storage
    await StorageService.batchIncrementUsage(delta);
    await StorageService.clearExpiredCooldowns();
}

/**
 * Flush all pending usage to durable chrome.storage.local.
 * Thread-safe: concurrent calls reuse the existing in-flight flush promise.
 */
export async function flushPendingUsage(): Promise<void> {
    if (flushPromise) {
        return flushPromise;
    }
    flushPromise = doFlush();
    try {
        await flushPromise;
    } finally {
        flushPromise = null;
    }
}

/**
 * Called at SW boot to recover any unflushed pending seconds from a
 * previously-killed service worker.
 */
export async function recoverPending(): Promise<void> {
    await flushPendingUsage();
}

export function resetPending(): void {
    memory = emptyPlatformRecord(0);
    chrome.storage.session.remove(SESSION_KEY).catch(() => { });
}

