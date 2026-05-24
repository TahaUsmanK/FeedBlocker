import { AppSettings, DailyUsage, Platform, Streak } from '../types';

const KEYS = {
    USAGE: 'usage',
    SETTINGS: 'settings',
    STREAK: 'streak', // New key
    BADGES: 'badges' // New key
};

const DEFAULT_SETTINGS: AppSettings = {
    limits: {
        youtube: 0,
        instagram: 0,
        twitter: 0,
        tiktok: 0
    },
    focusMode: false,
    blocked: false
};

export const StorageService = {
    async getEncryptionKey(): Promise<string> {
        return "none"; // Placeholder
    },

    async getTodayUsage(): Promise<DailyUsage> {
        const today = new Date().toISOString().split('T')[0];
        const result = await chrome.storage.local.get(KEYS.USAGE);
        const allUsage = result[KEYS.USAGE] || {};

        if (!allUsage[today]) {
            return {
                date: today,
                total: 0,
                byPlatform: { youtube: 0, instagram: 0, twitter: 0, tiktok: 0 },
                videoCounts: { youtube: 0, instagram: 0, twitter: 0, tiktok: 0 }
            };
        }
        return allUsage[today];
    },

    async incrementUsage(platform: Platform, seconds: number = 1): Promise<void> {
        const today = new Date().toISOString().split('T')[0];
        const result = await chrome.storage.local.get(KEYS.USAGE);
        const allUsage = result[KEYS.USAGE] || {};

        if (!allUsage[today]) {
            allUsage[today] = {
                date: today,
                total: 0,
                byPlatform: { youtube: 0, instagram: 0, twitter: 0, tiktok: 0 },
                videoCounts: { youtube: 0, instagram: 0, twitter: 0, tiktok: 0 }
            };
            // New day separate logic could go here, but for now we trust `updateStreak` called separately or lazy check
        }

        allUsage[today].total += seconds;
        allUsage[today].byPlatform[platform] = (allUsage[today].byPlatform[platform] || 0) + seconds;

        await chrome.storage.local.set({ [KEYS.USAGE]: allUsage });
    },

    async incrementVideoCount(platform: Platform, count: number = 1): Promise<void> {
        const today = new Date().toISOString().split('T')[0];
        const result = await chrome.storage.local.get(KEYS.USAGE);
        const allUsage = result[KEYS.USAGE] || {};

        if (!allUsage[today]) await this.incrementUsage(platform, 0); // Init if needed

        // Re-fetch to be safe or just use object ref if we rely on JS single thread (safe in async generally if we await)
        // Simpler: just modify what we have, assume init from incrementUsage call above worked or do it manually
        if (!allUsage[today].videoCounts) {
            allUsage[today].videoCounts = { youtube: 0, instagram: 0, twitter: 0, tiktok: 0 };
        }

        allUsage[today].videoCounts[platform] = (allUsage[today].videoCounts[platform] || 0) + count;
        await chrome.storage.local.set({ [KEYS.USAGE]: allUsage });
    },

    async getSettings(): Promise<AppSettings> {
        const result = await chrome.storage.local.get(KEYS.SETTINGS);
        return { ...DEFAULT_SETTINGS, ...result[KEYS.SETTINGS] };
    },

    async saveSettings(settings: Partial<AppSettings>): Promise<void> {
        const current = await this.getSettings();
        await chrome.storage.local.set({ [KEYS.SETTINGS]: { ...current, ...settings } });
    },

    async getWeeklyStats(): Promise<DailyUsage[]> {
        const result = await chrome.storage.local.get(KEYS.USAGE);
        const allUsage = result[KEYS.USAGE] || {};
        const stats: DailyUsage[] = [];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];

            if (allUsage[dateStr]) {
                stats.push(allUsage[dateStr]);
            } else {
                stats.push({
                    date: dateStr,
                    total: 0,
                    byPlatform: { youtube: 0, instagram: 0, twitter: 0, tiktok: 0 },
                    videoCounts: { youtube: 0, instagram: 0, twitter: 0, tiktok: 0 }
                });
            }
        }
        return stats;
    },

    async getStreak(): Promise<Streak> {
        const result = await chrome.storage.local.get(KEYS.STREAK);
        return result[KEYS.STREAK] || { current: 0, best: 0, lastLogDate: '' };
    },

    async updateStreak(): Promise<void> {
        const today = new Date().toISOString().split('T')[0];
        const result = await chrome.storage.local.get(KEYS.STREAK);
        const streak: Streak = result[KEYS.STREAK] || { current: 0, best: 0, lastLogDate: '' };

        if (streak.lastLogDate === today) return; // Already updated today

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (streak.lastLogDate === yesterdayStr) {
            streak.current += 1;
        } else {
            streak.current = 1; // Reset or start new
        }

        if (streak.current > streak.best) {
            streak.best = streak.current;
        }

        streak.lastLogDate = today;
        await chrome.storage.local.set({ [KEYS.STREAK]: streak });

        // Check badges after streak update
        await this.checkBadges(streak);
    },

    async checkBadges(streak: Streak): Promise<void> {
        // Simple example: 3 day streak badge
        if (streak.current >= 3) {
            await this.awardBadge('focus_master');
        }
    },

    async awardBadge(badgeId: string): Promise<void> {
        const result = await chrome.storage.local.get(KEYS.BADGES);
        const badges = result[KEYS.BADGES] || [];
        if (!badges.includes(badgeId)) {
            badges.push(badgeId);
            await chrome.storage.local.set({ [KEYS.BADGES]: badges });
            // Could notify user here
        }
    },

    async getBadges(): Promise<string[]> {
        const result = await chrome.storage.local.get(KEYS.BADGES);
        return result[KEYS.BADGES] || [];
    }
};
