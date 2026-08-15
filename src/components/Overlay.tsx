import { useCallback, useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { getLimitState } from '../content/limitGuard';
import { useStorageListener, isUsageOrSettingsKey } from '../hooks/useStorageListener';
import { AppSettings, Platform } from '../types';
import { StorageService } from '../storage';

interface OverlayProps {
    platform?: Platform;
}

export const Overlay = ({ platform = 'youtube' }: OverlayProps) => {
    const [time, setTime] = useState(0);
    const [sessionSeconds, setSessionSeconds] = useState(0);
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [effectiveDaily, setEffectiveDaily] = useState(0);
    const [progress, setProgress] = useState<number | null>(null);

    const syncFromStorage = useCallback(async () => {
        chrome.runtime.sendMessage({ type: 'FLUSH_USAGE' }).catch(() => {});
        const usage = await StorageService.getTodayUsage();
        const currentSettings = await StorageService.getSettings();
        setTime(usage.byPlatform[platform] || 0);
        setSettings(currentSettings);

        const host = document.getElementById('focus-overlay-host');
        const session = parseInt(host?.dataset.sessionSeconds || '0', 10);
        setSessionSeconds(session);

        const state = await getLimitState(platform, session);
        if (!state) return;
        setEffectiveDaily(state.effectiveDailyLimit);
        if (state.effectiveDailyLimit > 0) {
            setProgress(
                Math.min(100, Math.round((state.dailyUsage / state.effectiveDailyLimit) * 100))
            );
        } else {
            setProgress(null);
        }
    }, [platform]);

    useEffect(() => {
        syncFromStorage();
    }, [syncFromStorage]);

    useStorageListener(syncFromStorage, isUsageOrSettingsKey);

    useEffect(() => {
        const tick = () => {
            const host = document.getElementById('focus-overlay-host');
            const isActive = host?.dataset.isActive === 'true';
            const session = parseInt(host?.dataset.sessionSeconds || '0', 10);
            setSessionSeconds(session);
            if (isActive) setTime((t) => t + 1);
        };
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    if (!settings) return null;

    const sessionLimit = settings.sessionLimits[platform] || 0;

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed top-4 right-4 z-[9999] bg-gray-900/95 text-white rounded-lg shadow-lg font-sans w-44 p-3">
            <div className="flex items-center gap-2 mb-2">
                <Timer size={14} className="text-blue-400 shrink-0" />
                <span className="text-xs font-semibold text-gray-300">Today</span>
                <span className="ml-auto font-mono text-sm font-bold text-blue-300">
                    {formatTime(time)}
                </span>
            </div>

            {sessionLimit > 0 && (
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-400">Session</span>
                    <span className="ml-auto font-mono text-xs text-gray-200">
                        {formatTime(sessionSeconds)}
                    </span>
                </div>
            )}

            {effectiveDaily > 0 && (
                <p className="text-[10px] text-gray-500 mb-1">
                    Cap {formatTime(effectiveDaily)}
                    {settings.schedule.enabled ? ' (schedule)' : ''}
                </p>
            )}

            {progress !== null && (
                <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${progress >= 80 ? 'bg-amber-500' : 'bg-blue-500'} ${progress >= 100 ? 'bg-red-500' : ''}`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
        </div>
    );
};
