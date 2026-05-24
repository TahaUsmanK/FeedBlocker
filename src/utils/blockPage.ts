import { setBlockState, type BlockState } from '../storage/blockState';
import { Platform } from '../types';

export async function redirectToBlockPage(
    platform: Platform,
    reason: BlockState['reason'],
    until: number
): Promise<void> {
    await setBlockState({
        platform,
        reason,
        until,
        blockedAt: Date.now(),
    });

    const url = chrome.runtime.getURL('blocked.html');
    const target = window.top ?? window;
    if (!target.location.href.includes('blocked.html')) {
        target.location.replace(url);
    }
}
