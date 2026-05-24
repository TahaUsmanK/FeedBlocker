import { emptyPlatformRecord } from '../lib/limits';
import { StorageService } from '../storage';
import { Platform, TRACKED_PLATFORMS } from '../types';

const SESSION_KEY = 'pendingUsage';

let memory = emptyPlatformRecord(0);
let hydrated = false;

async function hydrate(): Promise<void> {
    if (hydrated) return;
    const result = await chrome.storage.session.get(SESSION_KEY);
    const stored = result[SESSION_KEY] as Record<Platform, number> | undefined;
    if (stored) {
        for (const p of TRACKED_PLATFORMS) {
            memory[p] = stored[p] || 0;
        }
    }
    hydrated = true;
}

async function persistSession(): Promise<void> {
    await chrome.storage.session.set({ [SESSION_KEY]: { ...memory } });
}

export async function addPendingSeconds(platform: Platform, seconds: number): Promise<void> {
    await hydrate();
    memory[platform] = (memory[platform] || 0) + seconds;
    await persistSession();
}

/** Flush in-memory + session pending usage to durable storage */
export async function flushPendingUsage(): Promise<void> {
    await hydrate();
    await StorageService.rolloverDayIfNeeded();
    await StorageService.clearExpiredCooldowns();

    const batch = { ...memory };
    let hadUpdates = false;

    for (const platform of TRACKED_PLATFORMS) {
        if (batch[platform] > 0) {
            await StorageService.incrementUsage(platform, batch[platform]);
            memory[platform] = 0;
            hadUpdates = true;
        }
    }

    if (hadUpdates) {
        await persistSession();
    }
}

export async function resetPending(): Promise<void> {
    memory = emptyPlatformRecord(0);
    hydrated = true;
    await chrome.storage.session.remove(SESSION_KEY);
}
