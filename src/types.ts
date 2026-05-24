export type Platform = 'youtube' | 'instagram' | 'twitter';

export type VideoType = 'short' | 'video' | 'unknown';

/** YouTube: all pages vs Shorts only. Instagram: all vs Reels only. */
export type TrackingMode = 'all' | 'shorts_only' | 'reels_only';

export interface DailyUsage {
    date: string;
    total: number;
    byPlatform: Record<Platform, number>;
    videoCounts: Record<Platform, number>;
}

export interface ScheduleSettings {
    enabled: boolean;
    /** Hour 0–23 when evening stricter caps start */
    eveningStartHour: number;
    /** Hour 0–23 when evening caps end (exclusive) */
    eveningEndHour: number;
    /** Daily caps in minutes during evening; 0 = use base daily limit */
    eveningLimits: Record<Platform, number>;
    /** Daily caps in minutes on Sat/Sun; 0 = use base daily limit */
    weekendLimits: Record<Platform, number>;
}

export interface AppSettings {
    limits: Record<Platform, number>;
    sessionLimits: Record<Platform, number>;
    trackingMode: Record<Platform, TrackingMode>;
    schedule: ScheduleSettings;
    /** Minutes before user can revisit site after a block */
    cooldownMinutes: number;
}

export interface LimitLocks {
    /** ISO timestamp — cannot raise daily limits until this time */
    daily: Partial<Record<Platform, number>>;
    /** ISO timestamp — cannot raise session limits until this time */
    session: Partial<Record<Platform, number>>;
}

export interface CooldownState {
    until: Partial<Record<Platform, number>>;
}

export interface HelperData {
    platform: Platform;
    videoType: VideoType;
    isActive: boolean;
}

export interface LimitCheckResult {
    blocked: boolean;
    reason: 'daily' | 'session' | 'cooldown' | null;
    effectiveDailyLimit: number;
    effectiveSessionLimit: number;
    dailyUsage: number;
    sessionSeconds: number;
    cooldownUntil: number;
    warnDaily: boolean;
    warnSession: boolean;
}

export const TRACKED_PLATFORMS: Platform[] = ['youtube', 'instagram', 'twitter'];

export const DEFAULT_SCHEDULE: ScheduleSettings = {
    enabled: false,
    eveningStartHour: 18,
    eveningEndHour: 23,
    eveningLimits: { youtube: 0, instagram: 0, twitter: 0 },
    weekendLimits: { youtube: 0, instagram: 0, twitter: 0 },
};

export const DEFAULT_SETTINGS: AppSettings = {
    limits: { youtube: 0, instagram: 0, twitter: 0 },
    sessionLimits: { youtube: 0, instagram: 0, twitter: 0 },
    trackingMode: { youtube: 'all', instagram: 'all', twitter: 'all' },
    schedule: DEFAULT_SCHEDULE,
    cooldownMinutes: 15,
};
