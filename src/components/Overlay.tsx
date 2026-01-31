import { useEffect, useState } from 'react';
import { Timer, AlertTriangle } from 'lucide-react';
import { StorageService } from '../storage';
import { AppSettings, Platform } from '../types';
import { BlockScreen } from './BlockScreen';

interface OverlayProps {
    platform?: Platform;
}

export const Overlay = ({ platform = 'youtube' }: OverlayProps) => {
    const [time, setTime] = useState(0);
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [isExpanded, setIsExpanded] = useState(true);
    const [overrideUntil, setOverrideUntil] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            const usage = await StorageService.getTodayUsage();
            const currentSettings = await StorageService.getSettings();
            setTime(usage.byPlatform[platform] || 0);
            setSettings(currentSettings);
        };

        fetchData();
        const interval = setInterval(fetchData, 1000);
        return () => clearInterval(interval);
    }, []);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h > 0 ? h + 'h ' : ''}${m}m ${s}s`;
    };

    const limit = settings?.limits[platform] || 0;
    // Check if blocked: limit exists, usage exceeds limit, and not in override period
    const isBlocked = limit > 0 && time >= limit && Date.now() > overrideUntil;

    const handleOverride = () => {
        setOverrideUntil(Date.now() + 5 * 60 * 1000); // 5 minutes
    };

    if (isBlocked) {
        return <BlockScreen platform={platform} onOverride={handleOverride} />;
    }

    return (
        <div className={`fixed top-4 right-4 z-[9999] bg-gray-900 text-white rounded-lg shadow-xl transition-all duration-300 font-sans ${isExpanded ? 'w-64' : 'w-12 h-12 overflow-hidden'}`}>

            {/* Header / Draggable Handle */}
            <div
                className="flex items-center justify-between p-3 cursor-pointer bg-gray-800 hover:bg-gray-750"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <Timer size={18} className="text-blue-400" />
                    {isExpanded && <span className="font-bold text-sm">Target Focus</span>}
                </div>
                {!isExpanded && (
                    <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none">
                        {/* Mini view content could go here */}
                    </div>
                )}
            </div>

            {isExpanded && (
                <div className="p-4 space-y-3 border-t border-gray-700">
                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-gray-400 uppercase tracking-wider">Today's Time</span>
                        <span className="text-2xl font-mono font-bold text-blue-300">{formatTime(time)}</span>
                    </div>

                    {limit > 0 && (
                        <div className="flex items-center gap-2 p-2 bg-yellow-900/30 border border-yellow-700/50 rounded text-xs text-yellow-200">
                            <AlertTriangle size={14} />
                            <span>Limit: {formatTime(limit)}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
