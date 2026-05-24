import { evaluateLimits } from '../lib/limits';
import { StorageService } from '../storage';
import { LimitCheckResult, Platform } from '../types';
import { redirectToBlockPage } from '../utils/blockPage';
import { SESSION_IDLE_RESET_MS } from '../lib/tracking/session';
import { showWarningToast } from '../components/toastHost';
import { nextMidnightTimestamp } from '../lib/dates';

const warned = { daily: false, session: false };

export async function getLimitState(
    platform: Platform,
    sessionSeconds: number
): Promise<LimitCheckResult> {
    const [settings, usage, cooldownUntil] = await Promise.all([
        StorageService.getSettings(),
        StorageService.getTodayUsage(),
        StorageService.getCooldownUntil(platform),
    ]);

    return evaluateLimits(
        platform,
        settings,
        usage.byPlatform[platform] || 0,
        sessionSeconds,
        cooldownUntil
    );
}

export async function enforceLimits(platform: Platform, sessionSeconds: number): Promise<void> {
    const state = await getLimitState(platform, sessionSeconds);

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

    const settings = await StorageService.getSettings();
    let until = state.cooldownUntil;

    if (state.reason === 'daily') {
        await StorageService.setDailyLock(platform);
        until = nextMidnightTimestamp();
    } else if (state.reason === 'session') {
        const sessionUntil = Date.now() + SESSION_IDLE_RESET_MS;
        await StorageService.setSessionLock(platform, sessionUntil);
        until = Math.max(until, sessionUntil);
    }

    const cooldownUntil = Date.now() + settings.cooldownMinutes * 60 * 1000;
    await StorageService.startCooldown(platform, settings.cooldownMinutes);
    await redirectToBlockPage(platform, state.reason, Math.max(until, cooldownUntil));
}

export function startLimitGuard(platform: Platform) {
    const tick = async () => {
        const host = document.getElementById('focus-overlay-host');
        const sessionSeconds = parseInt(host?.dataset.sessionSeconds || '0', 10);
        await enforceLimits(platform, sessionSeconds);
    };

    tick();
    return setInterval(tick, 1000);
}
