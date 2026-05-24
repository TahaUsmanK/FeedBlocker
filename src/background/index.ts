import { StorageService } from '../storage';
import { HelperData, Platform } from '../types';
import { handleAlarm, setupAlarms } from './alarms';
import { setupNavigationGuard } from './navigation';

const pendingUsage: Record<Platform, number> = {
    youtube: 0,
    instagram: 0,
    twitter: 0,
};

chrome.runtime.onInstalled.addListener(() => {
    setupAlarms();
    StorageService.rolloverDayIfNeeded();
});

chrome.runtime.onStartup.addListener(() => {
    setupAlarms();
    StorageService.rolloverDayIfNeeded();
});

chrome.alarms.onAlarm.addListener((alarm) => handleAlarm(alarm.name));

setupNavigationGuard();

chrome.runtime.onMessage.addListener((message: { type: string; payload?: unknown }) => {
    if (message.type === 'HEARTBEAT') {
        const data = message.payload as HelperData;
        if (data?.isActive && data.platform) {
            pendingUsage[data.platform] = (pendingUsage[data.platform] || 0) + 1;
        }
        return;
    }

    if (message.type === 'VIDEO_VIEW') {
        const { platform } = message.payload as { platform?: Platform };
        if (platform) {
            StorageService.incrementVideoCount(platform);
        }
    }
});

setInterval(async () => {
    await StorageService.rolloverDayIfNeeded();
    await StorageService.clearExpiredCooldowns();

    for (const platform of Object.keys(pendingUsage) as Platform[]) {
        if (pendingUsage[platform] > 0) {
            await StorageService.incrementUsage(platform, pendingUsage[platform]);
            pendingUsage[platform] = 0;
        }
    }
}, 5000);
