import { detectPlatform } from '../lib/platforms/registry';
import { StorageService } from '../storage';
import { HelperData, Platform, TRACKED_PLATFORMS } from '../types';
import { handleAlarm, setupAlarms } from './alarms';
import { addPendingSeconds, flushPendingUsage, recoverPending } from './pendingUsage';
import { setupNavigationGuard } from './navigation';
import { updateBadge } from './badge';

let workerInitPromise: Promise<void> | null = null;

/**
 * Runs on every service-worker wake (install, startup, alarm, message, navigation).
 * MV3 SWs are ephemeral — we must re-initialize state each time they start.
 * Guarded by workerInitPromise to avoid concurrent duplicate startup runs.
 */
async function onWorkerStart(): Promise<void> {
    if (!workerInitPromise) {
        workerInitPromise = (async () => {
            // Recover any unflushed seconds from a previously-killed SW before doing anything else
            await recoverPending();
            await StorageService.migrateLegacyUsageIfNeeded();
            await StorageService.rolloverDayIfNeeded();
            await setupAlarms();
            await updateBadge();
        })();
    }
    return workerInitPromise;
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

/** Track the last timestamp (in whole seconds) a heartbeat was recorded per platform */
const lastHeartbeatSec: Partial<Record<Platform, number>> = {};

import { enforceLimitsInBackground } from './enforcement';

chrome.runtime.onMessage.addListener((message: { type: string; payload?: unknown }, sender) => {
    if (message.type === 'HEARTBEAT') {
        const data = message.payload as HelperData & { sessionSeconds?: number };
        if (data?.isActive && data.platform && TRACKED_PLATFORMS.includes(data.platform)) {
            const currentSec = Math.floor(Date.now() / 1000);
            // Deduplicate across multiple open tabs for the same platform in the same second
            if (lastHeartbeatSec[data.platform] !== currentSec) {
                lastHeartbeatSec[data.platform] = currentSec;
                addPendingSeconds(data.platform, 1);
            }
            // Always evaluate limits so warnings and blocks can be dispatched immediately
            void enforceLimitsInBackground(data.platform, data.sessionSeconds || 0, sender.tab?.id);
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
        if (detectPlatform(hostname)) {
            void flushPendingUsage();
        }
    } catch {
        /* ignore */
    }
});
