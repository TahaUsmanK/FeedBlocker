import { ALL_TRACKED_HOSTS } from '../lib/platforms/registry';
import { StorageService } from '../storage';
import { HelperData, Platform, TRACKED_PLATFORMS } from '../types';
import { handleAlarm, setupAlarms } from './alarms';
import { addPendingSeconds, flushPendingUsage, recoverPending } from './pendingUsage';
import { setupNavigationGuard } from './navigation';
import { updateBadge } from './badge';

/**
 * Runs on every service-worker wake (install, startup, alarm, message, navigation).
 * MV3 SWs are ephemeral — we must re-initialize state each time they start.
 */
async function onWorkerStart() {
    // Recover any unflushed seconds from a previously-killed SW before doing anything else
    await recoverPending();
    await StorageService.migrateLegacyUsageIfNeeded();
    await StorageService.rolloverDayIfNeeded();
    await setupAlarms();
    await updateBadge();
}

/**
 * MV3 CRITICAL: call onWorkerStart at the TOP LEVEL, not just inside event
 * listeners. This ensures initialization runs on every SW wake — including
 * alarm wakes and message wakes that don't fire onInstalled/onStartup.
 *
 * chrome.runtime.onInstalled / onStartup are kept for legacy safety but
 * the top-level call is the reliable entry point.
 */
void onWorkerStart();

chrome.runtime.onInstalled.addListener((details) => {
    void onWorkerStart();
    if (details.reason === 'install') {
        void chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') });
    }
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
            addPendingSeconds(data.platform, 1);
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
