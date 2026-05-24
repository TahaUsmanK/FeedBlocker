import { isEvening, isWeekend } from './dates';
import {
    AppSettings,
    LimitCheckResult,
    Platform,
    ScheduleSettings,
    TrackingMode,
    VideoType,
} from '../types';

export function emptyPlatformRecord<T>(value: T): Record<Platform, T> {
    return { youtube: value, instagram: value, twitter: value };
}

export function hostToPlatform(hostname: string): Platform | null {
    if (hostname.includes('youtube.com')) return 'youtube';
    if (hostname.includes('instagram.com')) return 'instagram';
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'twitter';
    return null;
}

export function shouldTrackContent(
    platform: Platform,
    mode: TrackingMode,
    videoType: VideoType,
    pathname: string
): boolean {
    if (platform === 'twitter') return true;

    if (platform === 'youtube') {
        if (mode === 'all') return videoType !== 'unknown';
        return pathname.includes('/shorts/');
    }

    if (platform === 'instagram') {
        if (mode === 'all') return true;
        return pathname.includes('/reels/');
    }

    return true;
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

export function describeSchedule(schedule: ScheduleSettings): string {
    if (!schedule.enabled) return 'Off';
    return `Evening ${schedule.eveningStartHour}:00–${schedule.eveningEndHour}:00, weekend caps`;
}
