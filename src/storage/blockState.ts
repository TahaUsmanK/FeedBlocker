import { Platform } from '../types';

export interface BlockState {
    platform: Platform;
    reason: 'daily' | 'session' | 'cooldown';
    until: number;
    blockedAt: number;
}

const BLOCK_STATE_KEY = 'lastBlock';

export async function setBlockState(state: BlockState): Promise<void> {
    await chrome.storage.session.set({ [BLOCK_STATE_KEY]: state });
}

/**
 * Reads block state with retry-on-null to handle the race between
 * navigation.ts writing to session storage and blocked.html loading.
 * Also supports reading the reason/until from URL search params as fallback
 * (set by navigation.ts when redirecting to blocked.html).
 */
export async function getBlockState(): Promise<BlockState | null> {
    // Prefer URL params (set synchronously by the navigation guard before redirect)
    const params = new URLSearchParams(location.search);
    const urlPlatform = params.get('platform') as Platform | null;
    const urlReason = params.get('reason') as BlockState['reason'] | null;
    const urlUntil = params.get('until');
    const urlBlockedAt = params.get('blockedAt');

    if (urlPlatform && urlReason && urlUntil) {
        return {
            platform: urlPlatform,
            reason: urlReason,
            until: parseInt(urlUntil, 10),
            blockedAt: parseInt(urlBlockedAt || '0', 10) || Date.now(),
        };
    }

    // Fallback: read from session storage (may need a few retries on cold load)
    for (let attempt = 0; attempt < 5; attempt++) {
        const result = await chrome.storage.session.get(BLOCK_STATE_KEY);
        const state = result[BLOCK_STATE_KEY] as BlockState | undefined;
        if (state) return state;
        if (attempt < 4) await new Promise((r) => setTimeout(r, 80));
    }

    return null;
}
