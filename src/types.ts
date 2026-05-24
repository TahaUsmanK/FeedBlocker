export type Platform =
    | 'youtube'
    | 'instagram'
    | 'twitter'
    | 'tiktok'
    | 'facebook'
    | 'reddit'
    | 'linkedin'
    | 'twitch'
    | 'pinterest';

export type VideoType = 'short' | 'video' | 'unknown';

export type TrackingMode = 'all' | 'shorts_only' | 'reels_only' | 'video_only';

export interface DailyUsage {
    date: string;
    total: number;
    byPlatform: Record<Platform, number>;
    videoCounts: Record<Platform, number>;
}

export interface ScheduleSettings {
    enabled: boolean;
    eveningStartHour: number;
    eveningEndHour: number;
    eveningLimits: Record<Platform, number>;
    weekendLimits: Record<Platform, number>;
}

export interface AppSettings {
    limits: Record<Platform, number>;
    sessionLimits: Record<Platform, number>;
    trackingMode: Record<Platform, TrackingMode>;
    schedule: ScheduleSettings;
    cooldownMinutes: number;
}

export interface LimitLocks {
    daily: Partial<Record<Platform, number>>;
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

export const TRACKED_PLATFORMS: Platform[] = [
    'youtube',
    'instagram',
    'twitter',
    'tiktok',
    'facebook',
    'reddit',
    'linkedin',
    'twitch',
    'pinterest',
];

export const DEFAULT_SCHEDULE: ScheduleSettings = {
    enabled: false,
    eveningStartHour: 18,
    eveningEndHour: 23,
    eveningLimits: Object.fromEntries(TRACKED_PLATFORMS.map((p) => [p, 0])) as Record<
        Platform,
        number
    >,
    weekendLimits: Object.fromEntries(TRACKED_PLATFORMS.map((p) => [p, 0])) as Record<
        Platform,
        number
    >,
};

export const DEFAULT_SETTINGS: AppSettings = {
    limits: Object.fromEntries(TRACKED_PLATFORMS.map((p) => [p, 0])) as Record<Platform, number>,
    sessionLimits: Object.fromEntries(TRACKED_PLATFORMS.map((p) => [p, 0])) as Record<
        Platform,
        number
    >,
    trackingMode: {
        youtube: 'all',
        instagram: 'all',
        twitter: 'all',
        tiktok: 'all',
        facebook: 'all',
        reddit: 'all',
        linkedin: 'all',
        twitch: 'video_only',
        pinterest: 'all',
    },
    schedule: DEFAULT_SCHEDULE,
    cooldownMinutes: 15,
};
