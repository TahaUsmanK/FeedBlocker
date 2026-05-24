import { msUntilMidnight } from '../lib/dates';
import { StorageService } from '../storage';

const MIDNIGHT_ALARM = 'focus-midnight-rollover';

export function setupAlarms() {
    chrome.alarms.create(MIDNIGHT_ALARM, {
        delayInMinutes: Math.max(msUntilMidnight() / 60_000, 0.1),
        periodInMinutes: 24 * 60,
    });
}

export function handleAlarm(name: string) {
    if (name === MIDNIGHT_ALARM) {
        StorageService.rolloverDayIfNeeded();
        StorageService.clearDailyLocks();
    }
}
