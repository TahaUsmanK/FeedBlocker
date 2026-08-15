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

/** Write the current in-memory totals to chrome.storage.session (fire-and-forget) */
function persistToSession(): void {
    chrome.storage.session.set({ [SESSION_KEY]: { ...memory } }).catch(() => {/* ignore */ });
}

/** Read the session buffer (handles missing key gracefully) */
async function readFromSession(): Promise<Record<Platform, number>> {
    const result = await chrome.storage.session.get(SESSION_KEY);
    const stored = result[SESSION_KEY] as Record<Platform, number> | undefined;
    if (!stored) return emptyPlatformRecord(0);
    // Merge with empty record so every platform key is guaranteed present
    return { ...emptyPlatformRecord(0), ...stored };
}

/** Clear the session buffer */
async function clearSession(): Promise<void> {
    await chrome.storage.session.remove(SESSION_KEY);
}

/**
 * Called on every HEARTBEAT from the content script.
 * Increments both the in-memory shadow AND the session-storage buffer so that
 * the data survives if Chrome kills the service worker before the next flush.
 */
export function addPendingSeconds(platform: Platform, seconds: number): void {
    memory[platform] = (memory[platform] || 0) + seconds;
    // Write-through: persist immediately so SW death cannot lose this data
    persistToSession();
}

/**
 * Flush all pending usage to durable chrome.storage.local.
 * Uses batchIncrementUsage for a single atomic read-modify-write.
 */
export async function flushPendingUsage(): Promise<void> {
    // Source of truth is session storage (survives SW kills)
    const batch = await readFromSession();

    const hasData = TRACKED_PLATFORMS.some((p) => (batch[p] || 0) > 0);
    if (!hasData) return;

    // Apply the batch atomically
    await StorageService.batchIncrementUsage(batch);
    await StorageService.clearExpiredCooldowns();

    // Clear the session buffer now that data is safely in local storage
    await clearSession();

    // Reset the in-memory shadow to match
    memory = emptyPlatformRecord(0);
}

/**
 * Called at SW boot to recover any unflushed pending seconds from a
 * previously-killed service worker. Must run before resuming normal operation.
 */
export async function recoverPending(): Promise<void> {
    const recovered = await readFromSession();
    const hasData = TRACKED_PLATFORMS.some((p) => (recovered[p] || 0) > 0);
    if (!hasData) return;

    // Restore in-memory shadow so subsequent heartbeats build on top of it
    memory = recovered;

    // Flush immediately to durable storage
    await flushPendingUsage();
}

export function resetPending(): void {
    memory = emptyPlatformRecord(0);
    chrome.storage.session.remove(SESSION_KEY).catch(() => { });
}
