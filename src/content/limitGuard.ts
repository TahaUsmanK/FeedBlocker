import { evaluateLimits } from '../lib/limits';
import { StorageService } from '../storage';
import { LimitCheckResult, Platform } from '../types';
import { forceBlankPage } from '../utils/blankPage';
import { SESSION_IDLE_RESET_MS } from '../lib/tracking/session';
import { showWarningToast } from '../components/toastHost';

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

    if (!state.blocked) return;

    if (state.reason === 'cooldown') {
        forceBlankPage();
        return;
    }

    const settings = await StorageService.getSettings();

    if (state.reason === 'daily') {
        await StorageService.setDailyLock(platform);
    } else if (state.reason === 'session') {
        await StorageService.setSessionLock(platform, Date.now() + SESSION_IDLE_RESET_MS);
    }

    await StorageService.startCooldown(platform, settings.cooldownMinutes);
    forceBlankPage();
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
