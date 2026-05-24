import { isEvening, isWeekend } from './dates';
import { hostToPlatform } from './platforms/registry';
import {
    AppSettings,
    LimitCheckResult,
    Platform,
    TRACKED_PLATFORMS,
} from '../types';

export { hostToPlatform };

export function emptyPlatformRecord(value: number): Record<Platform, number> {
    return Object.fromEntries(TRACKED_PLATFORMS.map((p) => [p, value])) as Record<
        Platform,
        number
    >;
}

export function normalizePlatformRecord(
    obj: Partial<Record<Platform, number>> | Record<string, number> | undefined
): Record<Platform, number> {
    const base = emptyPlatformRecord(0);
    if (!obj) return base;
    for (const p of TRACKED_PLATFORMS) {
        if (typeof obj[p] === 'number') base[p] = obj[p];
    }
    return base;
}

export function getEffectiveDailyLimit(
    platform: Platform,
    settings: AppSettings,
    now = new Date()
): number {
    const base = settings.limits[platform];
    if (base <= 0) return 0;

    if (!settings.schedule.enabled) return base;

    const candidates: number[] = [base];
    const { schedule } = settings;

    if (isWeekend(now)) {
        const weekendMin = schedule.weekendLimits[platform];
        if (weekendMin > 0) candidates.push(weekendMin * 60);
    }

    if (isEvening(now, schedule.eveningStartHour, schedule.eveningEndHour)) {
        const eveningMin = schedule.eveningLimits[platform];
        if (eveningMin > 0) candidates.push(eveningMin * 60);
    }

    return Math.min(...candidates);
}

export function evaluateLimits(
    platform: Platform,
    settings: AppSettings,
    dailyUsage: number,
    sessionSeconds: number,
    cooldownUntil: number,
    now = new Date()
): LimitCheckResult {
    const effectiveDailyLimit = getEffectiveDailyLimit(platform, settings, now);
    const effectiveSessionLimit = settings.sessionLimits[platform] || 0;

    const cooldownActive = cooldownUntil > now.getTime();

    const dailyBlocked =
        effectiveDailyLimit > 0 && dailyUsage >= effectiveDailyLimit;
    const sessionBlocked =
        effectiveSessionLimit > 0 && sessionSeconds >= effectiveSessionLimit;

    let blocked = false;
    let reason: LimitCheckResult['reason'] = null;

    if (cooldownActive) {
        blocked = true;
        reason = 'cooldown';
    } else if (dailyBlocked) {
        blocked = true;
        reason = 'daily';
    } else if (sessionBlocked) {
        blocked = true;
        reason = 'session';
    }

    const warnDaily =
        effectiveDailyLimit > 0 &&
        dailyUsage >= effectiveDailyLimit * 0.8 &&
        dailyUsage < effectiveDailyLimit;

    const warnSession =
        effectiveSessionLimit > 0 &&
        sessionSeconds >= effectiveSessionLimit * 0.8 &&
        sessionSeconds < effectiveSessionLimit;

    return {
        blocked,
        reason,
        effectiveDailyLimit,
        effectiveSessionLimit,
        dailyUsage,
        sessionSeconds,
        cooldownUntil,
        warnDaily,
        warnSession,
    };
}
