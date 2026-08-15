import { evaluateLimits } from '../lib/limits';
import { StorageService } from '../storage';
import { AppSettings, Platform } from '../types';
import { nextMidnightTimestamp } from '../lib/dates';
import { SESSION_IDLE_RESET_MS } from '../lib/tracking/session';
import { getPendingSeconds } from './pendingUsage';
import { PLATFORM_BY_ID } from '../lib/platforms/registry';

/**
 * In-memory cache for settings and cooldowns to avoid 3 storage reads per
 * second per active platform. Refreshed every CACHE_TTL_MS or on storage change.
 */
const CACHE_TTL_MS = 5_000;

let cachedSettings: AppSettings | null = null;
let cachedCooldowns: Partial<Record<Platform, number>> = {};
let cacheTimestamp = 0;

// Invalidate cache on any relevant storage change
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.settings || changes.cooldown)) {
        cacheTimestamp = 0; // force refresh on next call
    }
});

async function getCachedSettingsAndCooldown(platform: Platform) {
    const now = Date.now();
    if (cachedSettings && now - cacheTimestamp < CACHE_TTL_MS) {
        return {
            settings: cachedSettings,
            cooldownUntil: cachedCooldowns[platform] || 0,
        };
    }
    const [settings, cooldownUntil] = await Promise.all([
        StorageService.getSettings(),
        StorageService.getCooldownUntil(platform),
    ]);
    cachedSettings = settings;
    cachedCooldowns[platform] = cooldownUntil;
    cacheTimestamp = now;
    return { settings, cooldownUntil };
}

export async function enforceLimitsInBackground(
    platform: Platform,
    sessionSeconds: number,
    sourceTabId?: number
): Promise<void> {
    const [{ settings, cooldownUntil }, usage] = await Promise.all([
        getCachedSettingsAndCooldown(platform),
        StorageService.getTodayUsage(),
    ]);

    const state = evaluateLimits(
        platform,
        settings,
        (usage.byPlatform[platform] || 0) + getPendingSeconds(platform),
        sessionSeconds,
        cooldownUntil
    );

    if (state.warnDaily || state.warnSession) {
        if (sourceTabId) {
            chrome.tabs.sendMessage(sourceTabId, {
                type: 'WARN_TAB',
                payload: {
                    warnDaily: state.warnDaily,
                    warnSession: state.warnSession,
                    state,
                },
            }).catch(() => {});
        }
    }

    if (!state.blocked || !state.reason) return;

    let until = state.cooldownUntil;

    if (state.reason === 'daily') {
        await StorageService.setDailyLock(platform);
        until = nextMidnightTimestamp();
    } else if (state.reason === 'session') {
        const sessionUntil = Date.now() + SESSION_IDLE_RESET_MS;
        await StorageService.setSessionLock(platform, sessionUntil);
        until = Math.max(until, sessionUntil);
    }

    if (state.reason !== 'cooldown') {
        const cooldownMs = settings.cooldownMinutes * 60 * 1000;
        await StorageService.startCooldown(platform, settings.cooldownMinutes);
        until = Math.max(until, Date.now() + cooldownMs);
        // Invalidate cooldown cache since we just started one
        cacheTimestamp = 0;
    }

    // Broadcast BLOCK_TAB to relevant tabs.
    const hosts = PLATFORM_BY_ID[platform].hosts;
    const urlPatterns = hosts.flatMap((h) => [`*://*.${h}/*`, `*://${h}/*`]);
    const tabs = await chrome.tabs.query({ url: urlPatterns });
    for (const tab of tabs) {
        if (tab.id) {
            chrome.tabs.sendMessage(tab.id, {
                type: 'BLOCK_TAB',
                payload: {
                    platform,
                    reason: state.reason,
                    until,
                },
            }).catch(() => {});
        }
    }
}
