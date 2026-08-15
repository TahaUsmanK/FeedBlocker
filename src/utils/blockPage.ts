import { setBlockState, type BlockState } from '../storage/blockState';
import { Platform } from '../types';

/**
 * Redirects the current top-level page to blocked.html, encoding block state
 * in URL query params for race-free access on load, AND writing to session
 * storage as a secondary source of truth.
 */
export async function redirectToBlockPage(
    platform: Platform,
    reason: BlockState['reason'],
    until: number
): Promise<void> {
    const blockedAt = Date.now();

    // Write to session storage (best-effort; blocked page retries if needed)
    void setBlockState({ platform, reason, until, blockedAt });

    // Build URL with params — this is the primary, race-free data source
    const base = chrome.runtime.getURL('blocked.html');
    const params = new URLSearchParams({
        platform,
        reason,
        until: String(until),
        blockedAt: String(blockedAt),
    });
    const url = `${base}?${params.toString()}`;

    const target = window.top ?? window;
    if (!target.location.href.includes('blocked.html')) {
        target.location.replace(url);
    }
}
