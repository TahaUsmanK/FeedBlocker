export type Platform = 'youtube' | 'instagram' | 'twitter' | 'tiktok';

export type VideoType = 'short' | 'video' | 'stream' | 'unknown';

export interface DailyUsage {
    date: string; // YYYY-MM-DD
    total: number; // seconds
    byPlatform: Record<Platform, number>; // seconds
    videoCounts: Record<Platform, number>; // number of videos/shorts watched
}

export interface AppSettings {
    limits: Record<Platform, number>; // seconds, 0 = no limit
    focusMode: boolean;
    blocked: boolean;
}

export interface HelperData {
    platform: Platform;
    videoType: VideoType;
    isActive: boolean;
}

export interface Streak {
    current: number;
    best: number;
    lastLogDate: string; // YYYY-MM-DD
}

export type BadgeId = 'under_limit' | 'focus_master' | 'weekend_warrior';

export interface Badge {
    id: BadgeId;
    name: string;
    description: string;
    icon: string;
    earnedDate: string | null; // null if not earned
}
