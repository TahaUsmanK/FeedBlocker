import { msUntilMidnight } from '../lib/dates';
import { StorageService } from '../storage';
import { flushPendingUsage } from './pendingUsage';

export const MIDNIGHT_ALARM = 'focus-midnight-rollover';
export const FLUSH_ALARM = 'focus-flush-usage';
export const COOLDOWN_ALARM = 'focus-cooldown-sweep';

export function setupAlarms() {
    chrome.alarms.create(MIDNIGHT_ALARM, {
        delayInMinutes: Math.max(msUntilMidnight() / 60_000, 0.1),
        periodInMinutes: 24 * 60,
    });

    chrome.alarms.create(FLUSH_ALARM, {
        delayInMinutes: 1,
        periodInMinutes: 1,
    });

    chrome.alarms.create(COOLDOWN_ALARM, {
        delayInMinutes: 1,
        periodInMinutes: 5,
    });
}

export async function handleAlarm(name: string) {
    if (name === MIDNIGHT_ALARM) {
        await flushPendingUsage();
        await StorageService.rolloverDayIfNeeded();
        await StorageService.clearDailyLocks();
        return;
    }

    if (name === FLUSH_ALARM) {
        await flushPendingUsage();
        return;
    }

    if (name === COOLDOWN_ALARM) {
        await StorageService.clearExpiredCooldowns();
    }
}
