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

export async function getBlockState(): Promise<BlockState | null> {
    const result = await chrome.storage.session.get(BLOCK_STATE_KEY);
    return (result[BLOCK_STATE_KEY] as BlockState) || null;
}
