import { useCallback, useEffect, useState } from 'react';
import { Activity, Clock, BarChart3 } from 'lucide-react';
import { StorageService } from '../storage';
import { DailyUsage, TRACKED_PLATFORMS } from '../types';
import { useStorageListener, isUsageOrSettingsKey } from '../hooks/useStorageListener';

export const Dashboard = () => {
    const [usage, setUsage] = useState<DailyUsage | null>(null);
    const [weekly, setWeekly] = useState<DailyUsage[]>([]);

    const load = useCallback(async () => {
        chrome.runtime.sendMessage({ type: 'FLUSH_USAGE' }).catch(() => {});
        const [data, wky] = await Promise.all([
            StorageService.getTodayUsage(),
            StorageService.getWeeklyStats(),
        ]);
        setUsage(data);
        setWeekly(wky);
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    useStorageListener(load, isUsageOrSettingsKey);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    if (!usage) return <div className="p-4 text-center text-gray-500">Loading…</div>;

    const maxDaily = Math.max(...weekly.map((d) => d.total), 60);

    return (
        <div className="space-y-4">
            <div className="bg-blue-600 rounded-xl p-4 text-white">
                <div className="flex items-center gap-2 mb-1 opacity-90">
                    <Clock size={16} />
                    <span className="text-xs font-semibold uppercase tracking-wider">Today</span>
                </div>
                <div className="text-3xl font-bold font-mono">{formatTime(usage.total)}</div>
            </div>

            <div className="bg-gray-50 rounded-lg border border-gray-100 p-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2 mb-3">
                    <BarChart3 size={14} /> Last 7 days
                </h3>
                <div className="flex items-end justify-between h-20 gap-1">
                    {weekly.map((day, i) => {
                        const height = `${Math.max((day.total / maxDaily) * 100, 4)}%`;
                        const isToday = i === 6;
                        return (
                            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                                <div
                                    className={`w-full rounded-t ${isToday ? 'bg-blue-500' : 'bg-blue-200'}`}
                                    style={{ height }}
                                />
                                <span className="text-[10px] text-gray-400 font-mono">
                                    {day.date.split('-')[2]}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2 sticky top-0 bg-white py-1">
                    <Activity size={14} /> By site
                </h3>
                {TRACKED_PLATFORMS.map((p) => (
                    <div
                        key={p}
                        className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-100"
                    >
                        <span className="capitalize text-sm text-gray-700">{p}</span>
                        <span className="font-mono text-sm font-bold text-gray-900">
                            {formatTime(usage.byPlatform[p] || 0)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};
