import { StorageService } from '../storage';

/**
 * Update the toolbar badge with today's total minutes.
 * Non-critical — swallows all errors silently.
 */
export async function updateBadge(): Promise<void> {
    try {
        const usage = await StorageService.getTodayUsage();
        const totalMin = Math.floor(usage.total / 60);
        if (totalMin <= 0) {
            chrome.action.setBadgeText({ text: '' });
            return;
        }
        const text = totalMin >= 60 ? `${Math.floor(totalMin / 60)}h` : `${totalMin}m`;
        chrome.action.setBadgeText({ text });
        chrome.action.setBadgeBackgroundColor({ color: '#2A52BE' });
    } catch {
        /* badge is non-critical */
    }
}
