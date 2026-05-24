import { ALL_TRACKED_HOSTS, hostToPlatform } from '../lib/platforms/registry';
import { StorageService } from '../storage';

export function setupNavigationGuard() {
    chrome.webNavigation.onCommitted.addListener(async (details) => {
        if (details.frameId !== 0) return;

        let hostname: string;
        try {
            hostname = new URL(details.url).hostname;
        } catch {
            return;
        }

        if (!ALL_TRACKED_HOSTS.some((h) => hostname.includes(h))) return;

        const platform = hostToPlatform(hostname);
        if (!platform) return;

        await StorageService.clearExpiredCooldowns();
        const until = await StorageService.getCooldownUntil(platform);
        if (until > Date.now() && !details.url.startsWith('about:')) {
            chrome.tabs.update(details.tabId, { url: 'about:blank' });
        }
    });
}
