import { msUntilMidnight } from '../lib/dates';
import { StorageService } from '../storage';
import { flushPendingUsage } from './pendingUsage';
import { updateBadge } from './badge';

export const MIDNIGHT_ALARM = 'focus-midnight-rollover';
export const FLUSH_ALARM = 'focus-flush-usage';
export const COOLDOWN_ALARM = 'focus-cooldown-sweep';

/**
 * Create or update alarms.
 *
 * MV3 service workers are killed and restarted frequently. Calling
 * chrome.alarms.create without clearing existing alarms stacks up
 * duplicate entries. We now guard each alarm: only (re-)create it if
 * it is missing or its scheduled time is in the past.
 */
export async function setupAlarms(): Promise<void> {
    const all = await chrome.alarms.getAll();
    const existingNames = new Set(all.map((a) => a.name));
    const now = Date.now();

    // Midnight rollover — snap to the exact next midnight, not a relative delay
    // that drifts every time the SW restarts.
    const existing = all.find((a) => a.name === MIDNIGHT_ALARM);
    if (!existing || existing.scheduledTime <= now) {
        await chrome.alarms.clear(MIDNIGHT_ALARM);
        chrome.alarms.create(MIDNIGHT_ALARM, {
            when: now + msUntilMidnight(),
            periodInMinutes: 24 * 60,
        });
    }

    // 1-minute flush — create only if missing
    if (!existingNames.has(FLUSH_ALARM)) {
        chrome.alarms.create(FLUSH_ALARM, {
            delayInMinutes: 1,
            periodInMinutes: 1,
        });
    }

    // 5-minute cooldown sweep — create only if missing
    if (!existingNames.has(COOLDOWN_ALARM)) {
        chrome.alarms.create(COOLDOWN_ALARM, {
            delayInMinutes: 1,
            periodInMinutes: 5,
        });
    }
}

export async function handleAlarm(name: string): Promise<void> {
    if (name === MIDNIGHT_ALARM) {
        // Flush pending BEFORE rollover so last-second usage is not lost
        await flushPendingUsage();
        await StorageService.rolloverDayIfNeeded();
        await StorageService.clearDailyLocks();
        return;
    }

    if (name === FLUSH_ALARM) {
        await flushPendingUsage();
        await updateBadge();
        return;
    }

    if (name === COOLDOWN_ALARM) {
        await StorageService.clearExpiredCooldowns();
    }
}
