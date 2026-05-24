import { localDateString, nextMidnightTimestamp } from '../lib/dates';
import { emptyPlatformRecord } from '../lib/limits';
import {
    AppSettings,
    CooldownState,
    DailyUsage,
    DEFAULT_SETTINGS,
    LimitLocks,
    Platform,
} from '../types';

const KEYS = {
    USAGE: 'usage',
    SETTINGS: 'settings',
    LOCKS: 'limitLocks',
    COOLDOWN: 'cooldown',
    CURRENT_DATE: 'currentDate',
};

export type SaveSettingsResult =
    | { ok: true }
    | { ok: false; error: string; lockedPlatforms: Platform[] };

function migrateSettings(stored: Partial<AppSettings>): AppSettings {
    return {
        limits: { ...DEFAULT_SETTINGS.limits, ...stored.limits },
        sessionLimits: { ...DEFAULT_SETTINGS.sessionLimits, ...stored.sessionLimits },
        trackingMode: { ...DEFAULT_SETTINGS.trackingMode, ...stored.trackingMode },
        schedule: { ...DEFAULT_SETTINGS.schedule, ...stored.schedule },
        cooldownMinutes: stored.cooldownMinutes ?? DEFAULT_SETTINGS.cooldownMinutes,
    };
}

function stripTiktok<T extends Record<string, unknown>>(obj: T): Record<Platform, number> {
    const { youtube = 0, instagram = 0, twitter = 0 } = obj as Record<string, number>;
    return { youtube, instagram, twitter };
}

export const StorageService = {
    async getCurrentDateKey(): Promise<string> {
        const result = await chrome.storage.local.get(KEYS.CURRENT_DATE);
        return (result[KEYS.CURRENT_DATE] as string) || '';
    },

    async setCurrentDateKey(date: string): Promise<void> {
        await chrome.storage.local.set({ [KEYS.CURRENT_DATE]: date });
    },

    async rolloverDayIfNeeded(): Promise<boolean> {
        const today = localDateString();
        const stored = await this.getCurrentDateKey();
        if (stored === today) return false;

        await this.setCurrentDateKey(today);
        await this.clearDailyLocks();
        return true;
    },

    async getTodayUsage(): Promise<DailyUsage> {
        await this.rolloverDayIfNeeded();
        const today = localDateString();
        const result = await chrome.storage.local.get(KEYS.USAGE);
        const allUsage = result[KEYS.USAGE] || {};

        if (!allUsage[today]) {
            return {
                date: today,
                total: 0,
                byPlatform: emptyPlatformRecord(0),
                videoCounts: emptyPlatformRecord(0),
            };
        }

        const day = allUsage[today];
        return {
            date: day.date,
            total: day.total,
            byPlatform: stripTiktok(day.byPlatform || {}),
            videoCounts: stripTiktok(day.videoCounts || {}),
        };
    },

    async incrementUsage(platform: Platform, seconds: number = 1): Promise<void> {
        await this.rolloverDayIfNeeded();
        const today = localDateString();
        const result = await chrome.storage.local.get(KEYS.USAGE);
        const allUsage = result[KEYS.USAGE] || {};

        if (!allUsage[today]) {
            allUsage[today] = {
                date: today,
                total: 0,
                byPlatform: emptyPlatformRecord(0),
                videoCounts: emptyPlatformRecord(0),
            };
        }

        allUsage[today].total += seconds;
        allUsage[today].byPlatform[platform] =
            (allUsage[today].byPlatform[platform] || 0) + seconds;

        await chrome.storage.local.set({ [KEYS.USAGE]: allUsage });
    },

    async incrementVideoCount(platform: Platform, count: number = 1): Promise<void> {
        await this.rolloverDayIfNeeded();
        const today = localDateString();
        const result = await chrome.storage.local.get(KEYS.USAGE);
        const allUsage = result[KEYS.USAGE] || {};

        if (!allUsage[today]) {
            await this.incrementUsage(platform, 0);
            const refreshed = await chrome.storage.local.get(KEYS.USAGE);
            Object.assign(allUsage, refreshed[KEYS.USAGE]);
        }

        if (!allUsage[today].videoCounts) {
            allUsage[today].videoCounts = emptyPlatformRecord(0);
        }

        allUsage[today].videoCounts[platform] =
            (allUsage[today].videoCounts[platform] || 0) + count;
        await chrome.storage.local.set({ [KEYS.USAGE]: allUsage });
    },

    async getSettings(): Promise<AppSettings> {
        const result = await chrome.storage.local.get(KEYS.SETTINGS);
        return migrateSettings(result[KEYS.SETTINGS] || {});
    },

    async getLimitLocks(): Promise<LimitLocks> {
        const result = await chrome.storage.local.get(KEYS.LOCKS);
        return (result[KEYS.LOCKS] as LimitLocks) || { daily: {}, session: {} };
    },

    async getCooldowns(): Promise<CooldownState> {
        const result = await chrome.storage.local.get(KEYS.COOLDOWN);
        return (result[KEYS.COOLDOWN] as CooldownState) || { until: {} };
    },

    async getCooldownUntil(platform: Platform): Promise<number> {
        const cd = await this.getCooldowns();
        return cd.until[platform] || 0;
    },

    isPlatformDailyLocked(platform: Platform, locks: LimitLocks, now = Date.now()): boolean {
        const until = locks.daily[platform];
        return until !== undefined && until > now;
    },

    isPlatformSessionLocked(platform: Platform, locks: LimitLocks, now = Date.now()): boolean {
        const until = locks.session[platform];
        return until !== undefined && until > now;
    },

    async setDailyLock(platform: Platform): Promise<void> {
        const locks = await this.getLimitLocks();
        locks.daily[platform] = nextMidnightTimestamp();
        await chrome.storage.local.set({ [KEYS.LOCKS]: locks });
    },

    async setSessionLock(platform: Platform, untilMs: number): Promise<void> {
        const locks = await this.getLimitLocks();
        const existing = locks.session[platform] || 0;
        locks.session[platform] = Math.max(existing, untilMs);
        await chrome.storage.local.set({ [KEYS.LOCKS]: locks });
    },

    async clearDailyLocks(): Promise<void> {
        const locks = await this.getLimitLocks();
        locks.daily = {};
        await chrome.storage.local.set({ [KEYS.LOCKS]: locks });
    },

    async startCooldown(platform: Platform, minutes: number): Promise<void> {
        const cd = await this.getCooldowns();
        const until = Date.now() + minutes * 60 * 1000;
        cd.until[platform] = Math.max(cd.until[platform] || 0, until);
        await chrome.storage.local.set({ [KEYS.COOLDOWN]: cd });
    },

    async clearExpiredCooldowns(now = Date.now()): Promise<void> {
        const cd = await this.getCooldowns();
        let changed = false;
        for (const p of Object.keys(cd.until) as Platform[]) {
            if ((cd.until[p] || 0) <= now) {
                delete cd.until[p];
                changed = true;
            }
        }
        if (changed) await chrome.storage.local.set({ [KEYS.COOLDOWN]: cd });
    },

    /** Reject increases to limits while a platform lock is active */
    async saveSettings(partial: Partial<AppSettings>): Promise<SaveSettingsResult> {
        const current = await this.getSettings();
        const merged = migrateSettings({ ...current, ...partial });
        const locks = await this.getLimitLocks();
        const now = Date.now();
        const lockedPlatforms: Platform[] = [];

        for (const platform of ['youtube', 'instagram', 'twitter'] as Platform[]) {
            const dailyLocked = this.isPlatformDailyLocked(platform, locks, now);
            const sessionLocked = this.isPlatformSessionLocked(platform, locks, now);

            if (dailyLocked) {
                if (merged.limits[platform] > current.limits[platform]) {
                    lockedPlatforms.push(platform);
                    merged.limits[platform] = current.limits[platform];
                }
                if (merged.schedule.enabled && partial.schedule) {
                    const ev = merged.schedule.eveningLimits[platform];
                    const wv = merged.schedule.weekendLimits[platform];
                    const curEv = current.schedule.eveningLimits[platform];
                    const curWv = current.schedule.weekendLimits[platform];
                    if (ev > curEv || wv > curWv) {
                        if (!lockedPlatforms.includes(platform)) lockedPlatforms.push(platform);
                        merged.schedule.eveningLimits[platform] = curEv;
                        merged.schedule.weekendLimits[platform] = curWv;
                    }
                }
            }

            if (sessionLocked && merged.sessionLimits[platform] > current.sessionLimits[platform]) {
                if (!lockedPlatforms.includes(platform)) lockedPlatforms.push(platform);
                merged.sessionLimits[platform] = current.sessionLimits[platform];
            }
        }

        await chrome.storage.local.set({ [KEYS.SETTINGS]: merged });

        if (lockedPlatforms.length > 0) {
            return {
                ok: false,
                error: 'Limit increases are locked until the current period ends.',
                lockedPlatforms,
            };
        }
        return { ok: true };
    },

    async getAllUsage(): Promise<Record<string, DailyUsage>> {
        const result = await chrome.storage.local.get(KEYS.USAGE);
        return (result[KEYS.USAGE] as Record<string, DailyUsage>) || {};
    },

    async resetTodayUsage(): Promise<void> {
        const today = localDateString();
        const result = await chrome.storage.local.get(KEYS.USAGE);
        const allUsage = result[KEYS.USAGE] || {};
        delete allUsage[today];
        await chrome.storage.local.set({ [KEYS.USAGE]: allUsage });
    },

    async exportUsageCsv(): Promise<string> {
        const all = await this.getAllUsage();
        const dates = Object.keys(all).sort();
        const header = 'date,total,youtube,instagram,twitter,youtube_videos,instagram_videos,twitter_videos';
        const rows = dates.map((date) => {
            const d = all[date];
            const bp = stripTiktok(d.byPlatform || {});
            const vc = stripTiktok(d.videoCounts || {});
            return [
                date,
                d.total,
                bp.youtube,
                bp.instagram,
                bp.twitter,
                vc.youtube,
                vc.instagram,
                vc.twitter,
            ].join(',');
        });
        return [header, ...rows].join('\n');
    },

    async getWeeklyStats(): Promise<DailyUsage[]> {
        const result = await chrome.storage.local.get(KEYS.USAGE);
        const allUsage = result[KEYS.USAGE] || {};
        const stats: DailyUsage[] = [];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dateStr = localDateString(d);

            if (allUsage[dateStr]) {
                const day = allUsage[dateStr];
                stats.push({
                    date: day.date,
                    total: day.total,
                    byPlatform: stripTiktok(day.byPlatform || {}),
                    videoCounts: stripTiktok(day.videoCounts || {}),
                });
            } else {
                stats.push({
                    date: dateStr,
                    total: 0,
                    byPlatform: emptyPlatformRecord(0),
                    videoCounts: emptyPlatformRecord(0),
                });
            }
        }
        return stats;
    },
};
