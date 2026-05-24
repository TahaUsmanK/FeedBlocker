import { ALL_TRACKED_HOSTS, hostToPlatform } from '../lib/platforms/registry';
import { StorageService } from '../storage';
import { setBlockState } from '../storage/blockState';

import { Platform } from '../types';

function blockTab(tabId: number, platform: Platform, until: number) {
    void setBlockState({
        platform,
        reason: 'cooldown',
        until,
        blockedAt: Date.now(),
    });
    chrome.tabs.update(tabId, { url: chrome.runtime.getURL('blocked.html') });
}

export function setupNavigationGuard() {
    chrome.webNavigation.onCommitted.addListener(async (details) => {
        if (details.frameId !== 0) return;

        const url = details.url;
        if (url.includes('blocked.html')) return;

        let hostname: string;
        try {
            hostname = new URL(url).hostname;
        } catch {
            return;
        }

        if (!ALL_TRACKED_HOSTS.some((h) => hostname.includes(h))) return;

        const platform = hostToPlatform(hostname);
        if (!platform) return;

        await StorageService.clearExpiredCooldowns();
        const until = await StorageService.getCooldownUntil(platform);
        if (until > Date.now()) {
            blockTab(details.tabId, platform, until);
        }
    });
}
