import { StorageService } from '../storage';
import { HelperData, Platform } from '../types';

let pendingUsage: Record<Platform, number> = {
    youtube: 0,
    instagram: 0,
    twitter: 0,
    tiktok: 0
};

// Listen for heartbeats and events from content scripts
chrome.runtime.onMessage.addListener((message: { type: string; payload: any }, _sender: chrome.runtime.MessageSender, _sendResponse: (response?: any) => void) => {
    if (message.type === 'HEARTBEAT') {
        const data = message.payload as HelperData;
        if (data.isActive && data.platform) {
            pendingUsage[data.platform] = (pendingUsage[data.platform] || 0) + 1;
        }
    } else if (message.type === 'VIDEO_VIEW') {
        const { platform } = message.payload;
        if (platform) {
            StorageService.incrementVideoCount(platform);
        }
    }
});

// Flush to storage every 5 seconds
setInterval(async () => {
    const platforms = Object.keys(pendingUsage) as Platform[];
    let hasUpdates = false;

    // Also try to update streak occasionally (e.g. once per session or day check)
    // For simplicity, we can do it here but check inside the service if it's needed
    // In a real app we'd use an Alarm API for once-a-day, but this is fine for MVP
    await StorageService.updateStreak();

    for (const platform of platforms) {
        if (pendingUsage[platform] > 0) {
            await StorageService.incrementUsage(platform, pendingUsage[platform]);
            pendingUsage[platform] = 0;
            hasUpdates = true;
        }
    }

    if (hasUpdates) {
        // Optional: Broadcast update to popups/options if open
    }
}, 5000);

console.log('FocusOverlay Background Worker Initialized');
