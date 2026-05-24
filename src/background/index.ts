import { ALL_TRACKED_HOSTS } from '../lib/platforms/registry';
import { StorageService } from '../storage';
import { HelperData, Platform, TRACKED_PLATFORMS } from '../types';
import { handleAlarm, setupAlarms } from './alarms';
import { addPendingSeconds, flushPendingUsage } from './pendingUsage';
import { setupNavigationGuard } from './navigation';

async function onWorkerStart() {
    setupAlarms();
    await StorageService.migrateLegacyUsageIfNeeded();
    await StorageService.rolloverDayIfNeeded();
}

chrome.runtime.onInstalled.addListener(() => {
    void onWorkerStart();
});

chrome.runtime.onStartup.addListener(() => {
    void onWorkerStart();
});

chrome.alarms.onAlarm.addListener((alarm) => {
    void handleAlarm(alarm.name);
});

setupNavigationGuard();

chrome.runtime.onMessage.addListener((message: { type: string; payload?: unknown }) => {
    if (message.type === 'HEARTBEAT') {
        const data = message.payload as HelperData;
        if (data?.isActive && data.platform && TRACKED_PLATFORMS.includes(data.platform)) {
            void addPendingSeconds(data.platform, 1);
        }
        return;
    }

    if (message.type === 'VIDEO_VIEW') {
        const { platform } = message.payload as { platform?: Platform };
        if (platform && TRACKED_PLATFORMS.includes(platform)) {
            void StorageService.incrementVideoCount(platform);
        }
    }

    if (message.type === 'FLUSH_USAGE') {
        void flushPendingUsage();
    }
});

chrome.tabs.onRemoved.addListener((_tabId, removeInfo) => {
    if (removeInfo.isWindowClosing) return;
    void flushPendingUsage();
});

chrome.windows.onRemoved.addListener(() => {
    void flushPendingUsage();
});

/** Wake worker when a tracked tab navigates — opportunistic flush */
chrome.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId !== 0) return;
    try {
        const hostname = new URL(details.url).hostname;
        if (ALL_TRACKED_HOSTS.some((h) => hostname.includes(h))) {
            void flushPendingUsage();
        }
    } catch {
        /* ignore */
    }
});
