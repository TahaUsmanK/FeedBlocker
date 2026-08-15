import { localDateString, nextMidnightTimestamp } from '../lib/dates';
import { emptyPlatformRecord, normalizePlatformRecord } from '../lib/limits';
import {
    AppSettings,
    CooldownState,
    DailyUsage,
    DEFAULT_SETTINGS,
    LimitLocks,
    Platform,
    TRACKED_PLATFORMS,
} from '../types';
import {
    isUsageStorageKey,
    LEGACY_USAGE_KEY,
    todayUsageKey,
    usageKeyForDate,
} from './keys';
import { withStorageLock } from './mutex';

const KEYS = {
    SETTINGS: 'settings',
    LOCKS: 'limitLocks',
    COOLDOWN: 'cooldown',
    CURRENT_DATE: 'currentDate',
};

export type SaveSettingsResult =
    | { ok: true }
    | { ok: false; error: string; lockedPlatforms: Platform[] };

function emptyDay(date: string): DailyUsage {
    return {
        date,
        total: 0,
        byPlatform: emptyPlatformRecord(0),
        videoCounts: emptyPlatformRecord(0),
    };
}

function migrateSettings(stored: Partial<AppSettings>): AppSettings {
    const schedule = { ...DEFAULT_SETTINGS.schedule, ...stored.schedule };
    return {
        limits: { ...DEFAULT_SETTINGS.limits, ...normalizePlatformRecord(stored.limits) },
        sessionLimits: {
            ...DEFAULT_SETTINGS.sessionLimits,
            ...normalizePlatformRecord(stored.sessionLimits),
        },
        trackingMode: { ...DEFAULT_SETTINGS.trackingMode, ...stored.trackingMode },
        schedule: {
            ...schedule,
            eveningLimits: {
                ...DEFAULT_SETTINGS.schedule.eveningLimits,
                ...normalizePlatformRecord(schedule.eveningLimits),
            },
            weekendLimits: {
                ...DEFAULT_SETTINGS.schedule.weekendLimits,
                ...normalizePlatformRecord(schedule.weekendLimits),
            },
        },
        cooldownMinutes: stored.cooldownMinutes ?? DEFAULT_SETTINGS.cooldownMinutes,
    };
}

async function readDay(date: string): Promise<DailyUsage> {
    const key = usageKeyForDate(date);
    const result = await chrome.storage.local.get(key);
    const day = result[key] as DailyUsage | undefined;
    if (!day) return emptyDay(date);
    return {
        date: day.date || date,
        total: day.total || 0,
        byPlatform: normalizePlatformRecord(day.byPlatform),
        videoCounts: normalizePlatformRecord(day.videoCounts),
    };
}

async function writeDay(day: DailyUsage): Promise<void> {
    await chrome.storage.local.set({ [usageKeyForDate(day.date)]: day });
}

let legacyMigrated = false;

export const StorageService = {
    async migrateLegacyUsageIfNeeded(): Promise<void> {
        if (legacyMigrated) return;
        await withStorageLock(async () => {
            if (legacyMigrated) return;
            const result = await chrome.storage.local.get(LEGACY_USAGE_KEY);
            const legacy = result[LEGACY_USAGE_KEY] as Record<string, DailyUsage> | undefined;
            if (!legacy || typeof legacy !== 'object') {
                legacyMigrated = true;
                return;
            }

            const toSet: Record<string, DailyUsage> = {};
            for (const [date, day] of Object.entries(legacy)) {
                toSet[usageKeyForDate(date)] = {
                    ...emptyDay(date),
                    ...day,
                    date,
                    byPlatform: normalizePlatformRecord(day.byPlatform),
                    videoCounts: normalizePlatformRecord(day.videoCounts),
                };
            }
            await chrome.storage.local.set(toSet);
            await chrome.storage.local.remove(LEGACY_USAGE_KEY);
            legacyMigrated = true;
        });
    },

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
        await this.migrateLegacyUsageIfNeeded();
        await this.rolloverDayIfNeeded();
        return readDay(localDateString());
    },

    async incrementUsage(platform: Platform, seconds: number = 1): Promise<void> {
        if (seconds <= 0) return;

        await withStorageLock(async () => {
            await this.rolloverDayIfNeeded();
            const today = localDateString();
            const day = await readDay(today);
            day.total += seconds;
            day.byPlatform[platform] = (day.byPlatform[platform] || 0) + seconds;
            await writeDay(day);
        });
    },

    /**
     * Atomic batch increment — reads the day once, applies all platform deltas,
     * then writes once. Much safer than N sequential incrementUsage calls when
     * the service worker may be killed between writes.
     */
    async batchIncrementUsage(increments: Partial<Record<Platform, number>>): Promise<void> {
        const nonZero = Object.entries(increments).filter(([, v]) => (v ?? 0) > 0);
        if (nonZero.length === 0) return;

        await withStorageLock(async () => {
            await this.rolloverDayIfNeeded();
            const today = localDateString();
            const day = await readDay(today);
            for (const [platform, seconds] of nonZero) {
                const p = platform as Platform;
                day.total += seconds!;
                day.byPlatform[p] = (day.byPlatform[p] || 0) + seconds!;
            }
            await writeDay(day);
        });
    },

    async incrementVideoCount(platform: Platform, count: number = 1): Promise<void> {
        await withStorageLock(async () => {
            await this.rolloverDayIfNeeded();
            const today = localDateString();
            const day = await readDay(today);
            day.videoCounts[platform] = (day.videoCounts[platform] || 0) + count;
            await writeDay(day);
        });
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

    async saveSettings(partial: Partial<AppSettings>): Promise<SaveSettingsResult> {
        const current = await this.getSettings();
        const merged = migrateSettings({ ...current, ...partial });
        const locks = await this.getLimitLocks();
        const now = Date.now();
        const lockedPlatforms: Platform[] = [];

        for (const platform of TRACKED_PLATFORMS) {
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
        await this.migrateLegacyUsageIfNeeded();
        const all = await chrome.storage.local.get(null);
        const out: Record<string, DailyUsage> = {};
        for (const [key, value] of Object.entries(all)) {
            if (!isUsageStorageKey(key)) continue;
            const date = key.replace('usage:', '');
            const day = value as DailyUsage;
            out[date] = {
                date,
                total: day.total || 0,
                byPlatform: normalizePlatformRecord(day.byPlatform),
                videoCounts: normalizePlatformRecord(day.videoCounts),
            };
        }
        return out;
    },

    async resetTodayUsage(): Promise<void> {
        await chrome.storage.local.remove(todayUsageKey());
    },

    async exportUsageCsv(): Promise<string> {
        const all = await this.getAllUsage();
        const dates = Object.keys(all).sort();
        const usageCols = TRACKED_PLATFORMS.join(',');
        const videoCols = TRACKED_PLATFORMS.map((p) => `${p}_videos`).join(',');
        const header = `date,total,${usageCols},${videoCols}`;
        const rows = dates.map((date) => {
            const d = all[date];
            return [
                date,
                d.total,
                ...TRACKED_PLATFORMS.map((p) => d.byPlatform[p]),
                ...TRACKED_PLATFORMS.map((p) => d.videoCounts[p]),
            ].join(',');
        });
        return [header, ...rows].join('\n');
    },

    async getWeeklyStats(): Promise<DailyUsage[]> {
        await this.migrateLegacyUsageIfNeeded();
        const today = new Date();
        const keys: string[] = [];
        const dates: string[] = [];

        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dateStr = localDateString(d);
            dates.push(dateStr);
            keys.push(usageKeyForDate(dateStr));
        }

        const result = await chrome.storage.local.get(keys);
        return dates.map((dateStr) => {
            const day = result[usageKeyForDate(dateStr)] as DailyUsage | undefined;
            if (!day) return emptyDay(dateStr);
            return {
                date: dateStr,
                total: day.total || 0,
                byPlatform: normalizePlatformRecord(day.byPlatform),
                videoCounts: normalizePlatformRecord(day.videoCounts),
            };
        });
    },
};
