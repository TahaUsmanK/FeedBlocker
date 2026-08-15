import { useCallback, useEffect, useState } from 'react';
import { StorageService } from '../storage';
import { DailyUsage, TRACKED_PLATFORMS } from '../types';
import { useStorageListener, isUsageOrSettingsKey } from '../hooks/useStorageListener';

const PLATFORM_COLORS: Record<string, string> = {
    youtube: '#ff0000',
    instagram: '#e1306c',
    twitter: '#1d9bf0',
    tiktok: '#010101',
    facebook: '#1877f2',
    reddit: '#ff4500',
    linkedin: '#0a66c2',
    twitch: '#9146ff',
    pinterest: '#e60023',
};

function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return `${seconds}s`;
}

export const Dashboard = () => {
    const [usage, setUsage] = useState<DailyUsage | null>(null);
    const [weekly, setWeekly] = useState<DailyUsage[]>([]);

    const load = useCallback(async () => {
        const [data, wky] = await Promise.all([
            StorageService.getTodayUsage(),
            StorageService.getWeeklyStats(),
        ]);
        setUsage(data);
        setWeekly(wky);
    }, []);

    useEffect(() => {
        chrome.runtime.sendMessage({ type: 'FLUSH_USAGE' }).catch(() => { });
        void load();
    }, [load]);

    useStorageListener(load, isUsageOrSettingsKey);

    if (!usage) return <div className="dash-loading" aria-busy="true">Loading…</div>;

    // Only show platforms with usage > 0
    const activePlatforms = TRACKED_PLATFORMS.filter((p) => (usage.byPlatform[p] || 0) > 0);

    const maxDaily = Math.max(...weekly.map((d) => d.total), 60);

    return (
        <div className="dash-root">
            {/* Total today */}
            <div className="dash-hero">
                <div className="dash-hero-label">Today</div>
                <div className="dash-hero-value">{formatTime(usage.total)}</div>
            </div>

            {/* 7-day sparkline */}
            <div className="dash-week" aria-label="Last 7 days usage">
                {weekly.map((day, i) => {
                    const pct = Math.max((day.total / maxDaily) * 100, 3);
                    const isToday = i === 6;
                    const dayLabel = new Date(day.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' });
                    return (
                        <div key={day.date} className="dash-week-col" title={`${dayLabel}: ${formatTime(day.total)}`}>
                            <div
                                className={`dash-week-bar${isToday ? ' is-today' : ''}`}
                                style={{ height: `${pct}%` }}
                                aria-label={`${dayLabel} ${formatTime(day.total)}`}
                            />
                            <span className="dash-week-label">{dayLabel.slice(0, 1)}</span>
                        </div>
                    );
                })}
            </div>

            {/* Per-platform breakdown (only active platforms) */}
            {activePlatforms.length > 0 ? (
                <div className="dash-platforms">
                    {activePlatforms.map((p) => {
                        const seconds = usage.byPlatform[p] || 0;
                        const pct = usage.total > 0 ? (seconds / usage.total) * 100 : 0;
                        return (
                            <div key={p} className="dash-platform-row">
                                <div
                                    className="dash-platform-dot"
                                    style={{ background: PLATFORM_COLORS[p] ?? '#888' }}
                                    aria-hidden="true"
                                />
                                <span className="dash-platform-name">{p.charAt(0).toUpperCase() + p.slice(1)}</span>
                                <div className="dash-platform-bar-wrap">
                                    <div
                                        className="dash-platform-bar"
                                        style={{ width: `${pct}%`, background: PLATFORM_COLORS[p] ?? '#888' }}
                                    />
                                </div>
                                <span className="dash-platform-time">{formatTime(seconds)}</span>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="dash-empty">
                    <p>No usage tracked yet today.</p>
                    <p className="dash-empty-sub">Browse a tracked site and come back.</p>
                </div>
            )}
        </div>
    );
};
