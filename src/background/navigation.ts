import { ALL_TRACKED_HOSTS, hostToPlatform } from '../lib/platforms/registry';
import { StorageService } from '../storage';
import { setBlockState } from '../storage/blockState';
import { Platform } from '../types';

/**
 * Build the blocked.html URL with block state encoded in query params.
 * This is the reliable, race-free way to pass state to the blocked page
 * because the URL params are available synchronously when the page loads,
 * eliminating the storage-write vs page-load race condition.
 */
function buildBlockedUrl(platform: Platform, reason: string, until: number): string {
    const base = chrome.runtime.getURL('blocked.html');
    const params = new URLSearchParams({
        platform,
        reason,
        until: String(until),
        blockedAt: String(Date.now()),
    });
    return `${base}?${params.toString()}`;
}

function blockTab(tabId: number, platform: Platform, reason: 'daily' | 'session' | 'cooldown', until: number) {
    // Write to session storage (for completeness / future use)
    void setBlockState({ platform, reason, until, blockedAt: Date.now() });
    // Navigate with state encoded in URL params (race-free)
    chrome.tabs.update(tabId, { url: buildBlockedUrl(platform, reason, until) });
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
            blockTab(details.tabId, platform, 'cooldown', until);
        }
    });
}
