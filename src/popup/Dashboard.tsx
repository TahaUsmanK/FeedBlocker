import { useEffect, useState } from 'react';
import { Activity, Clock, BarChart3 } from 'lucide-react';
import { StorageService } from '../storage';
import { DailyUsage, Platform, Streak } from '../types';

export const Dashboard = () => {
    const [usage, setUsage] = useState<DailyUsage | null>(null);
    const [streak, setStreak] = useState<Streak | null>(null);
    const [badges, setBadges] = useState<string[]>([]);
    const [weekly, setWeekly] = useState<DailyUsage[]>([]);

    useEffect(() => {
        const fetch = async () => {
            const data = await StorageService.getTodayUsage();
            const str = await StorageService.getStreak();
            const bgs = await StorageService.getBadges();
            const wky = await StorageService.getWeeklyStats();
            setUsage(data);
            setStreak(str);
            setBadges(bgs);
            setWeekly(wky);
        };
        fetch();
    }, []);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m}m`;
    };

    if (!usage) return <div className="p-4 text-center">Loading...</div>;

    const platforms: Platform[] = ['youtube', 'instagram', 'twitter', 'tiktok'];
    const maxDaily = Math.max(...weekly.map(d => d.total), 3600); // Scale based on max or at least 1h

    return (
        <div className="space-y-4">
            {/* Total Time Card */}
            <div className="bg-blue-600 rounded-xl p-4 text-white shadow-lg">
                <div className="flex items-center gap-2 mb-1 opacity-90">
                    <Clock size={16} />
                    <span className="text-xs font-semibold uppercase tracking-wider">Total Focus Time</span>
                </div>
                <div className="text-3xl font-bold font-mono">
                    {formatTime(usage.total)}
                </div>
                <div className="text-xs opacity-75 mt-2">
                    Today's usage across all platforms
                </div>
            </div>

            {/* Streak & Stats Row */}
            <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-100 flex flex-col items-center">
                    <span className="text-orange-500 font-bold text-2xl">🔥 {streak?.current || 0}</span>
                    <span className="text-xs text-orange-400 font-medium uppercase mt-1">Day Streak</span>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 flex flex-col items-center">
                    <span className="text-purple-500 font-bold text-2xl">🏆 {badges.length}</span>
                    <span className="text-xs text-purple-400 font-medium uppercase mt-1">Badges</span>
                </div>
            </div>

            {/* Weekly Chart */}
            <div className="bg-gray-50 rounded-lg border border-gray-100 p-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2 mb-3">
                    <BarChart3 size={14} /> Last 7 Days
                </h3>
                <div className="flex items-end justify-between h-24 gap-1">
                    {weekly.map((day, i) => {
                        const height = Math.max((day.total / maxDaily) * 100, 5) + '%';
                        const isToday = i === 6;
                        return (
                            <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                                <div
                                    className={`w-full rounded-t ${isToday ? 'bg-blue-500' : 'bg-blue-200'}`}
                                    style={{ height }}
                                ></div>
                                <span className="text-[10px] text-gray-400 font-mono">
                                    {day.date.split('-')[2]}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Platform Breakdown */}
            <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <Activity size={14} /> Breakdown
                </h3>
                {platforms.map(p => (
                    <div key={p} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <span className="capitalize font-medium text-gray-700">{p}</span>
                        <span className="font-mono text-gray-900 font-bold">
                            {formatTime(usage.byPlatform[p] || 0)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};
