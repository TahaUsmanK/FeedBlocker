import { hostToPlatform } from '../lib/limits';
import { StorageService } from '../storage';
import { Platform } from '../types';

const TRACKED_HOSTS = ['youtube.com', 'instagram.com', 'twitter.com', 'x.com'];

export function setupNavigationGuard() {
    chrome.webNavigation.onCommitted.addListener(async (details) => {
        if (details.frameId !== 0) return;

        let hostname: string;
        try {
            hostname = new URL(details.url).hostname;
        } catch {
            return;
        }

        if (!TRACKED_HOSTS.some((h) => hostname.includes(h))) return;

        const platform = hostToPlatform(hostname);
        if (!platform) return;

        await StorageService.clearExpiredCooldowns();
        const until = await StorageService.getCooldownUntil(platform);
        if (until > Date.now() && !details.url.startsWith('about:')) {
            chrome.tabs.update(details.tabId, { url: 'about:blank' });
        }
    });
}

export async function isPlatformInCooldown(platform: Platform): Promise<boolean> {
    await StorageService.clearExpiredCooldowns();
    const until = await StorageService.getCooldownUntil(platform);
    return until > Date.now();
}
