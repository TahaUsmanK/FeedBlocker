import { evaluateLimits } from '../lib/limits';
import { StorageService } from '../storage';
import { AppSettings, LimitCheckResult, Platform } from '../types';
import { redirectToBlockPage } from '../utils/blockPage';
import { SESSION_IDLE_RESET_MS } from '../lib/tracking/session';
import { showWarningToast } from '../components/toastHost';
import { nextMidnightTimestamp } from '../lib/dates';
import { isUsageOrSettingsKey } from '../hooks/useStorageListener';

const warned = { daily: false, session: false };

let cachedSettings: AppSettings | null = null;
let cachedUsage = 0;
let cachedCooldown = 0;

async function syncCache(platform: Platform) {
    const [settings, usage, cooldownUntil] = await Promise.all([
        StorageService.getSettings(),
        StorageService.getTodayUsage(),
        StorageService.getCooldownUntil(platform),
    ]);
    cachedSettings = settings;
    // Keep local prediction if it's higher than the delayed storage flush
    cachedUsage = Math.max(cachedUsage, usage.byPlatform[platform] || 0);
    cachedCooldown = cooldownUntil;
}

export function getLimitState(
    platform: Platform,
    sessionSeconds: number
): LimitCheckResult | null {
    if (!cachedSettings) return null;
    return evaluateLimits(
        platform,
        cachedSettings,
        cachedUsage,
        sessionSeconds,
        cachedCooldown
    );
}

export async function enforceLimits(platform: Platform, sessionSeconds: number): Promise<void> {
    const state = getLimitState(platform, sessionSeconds);
    if (!state) return;

    if (state.warnDaily && !warned.daily) {
        warned.daily = true;
        const remaining = state.effectiveDailyLimit - state.dailyUsage;
        showWarningToast(
            platform,
            `~${Math.ceil(remaining / 60)} min left on today's limit`
        );
    }

    if (state.warnSession && !warned.session) {
        warned.session = true;
        const remaining = state.effectiveSessionLimit - state.sessionSeconds;
        showWarningToast(platform, `~${Math.ceil(remaining / 60)} min left this session`);
    }

    if (!state.blocked || !state.reason) return;

    if (state.reason === 'cooldown') {
        await redirectToBlockPage(platform, 'cooldown', state.cooldownUntil);
        return;
    }

    let until = state.cooldownUntil;

    if (state.reason === 'daily') {
        await StorageService.setDailyLock(platform);
        until = nextMidnightTimestamp();
    } else if (state.reason === 'session') {
        const sessionUntil = Date.now() + SESSION_IDLE_RESET_MS;
        await StorageService.setSessionLock(platform, sessionUntil);
        until = Math.max(until, sessionUntil);
    }

    const cooldownUntil = Date.now() + cachedSettings!.cooldownMinutes * 60 * 1000;
    await StorageService.startCooldown(platform, cachedSettings!.cooldownMinutes);
    await redirectToBlockPage(platform, state.reason, Math.max(until, cooldownUntil));
}

export function startLimitGuard(platform: Platform) {
    void syncCache(platform);

    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local') return;
        if (Object.keys(changes).some(isUsageOrSettingsKey) || Object.keys(changes).includes('cooldown')) {
            void syncCache(platform);
        }
    });

    const tick = async () => {
        const host = document.getElementById('focus-overlay-host');
        const isActive = host?.dataset.isActive === 'true';
        const sessionSeconds = parseInt(host?.dataset.sessionSeconds || '0', 10);
        
        if (isActive && cachedSettings) {
            cachedUsage += 1;
        }

        await enforceLimits(platform, sessionSeconds);
    };

    return setInterval(tick, 1000);
}
