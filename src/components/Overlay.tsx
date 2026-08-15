import { useCallback, useEffect, useRef, useState } from 'react';
import { evaluateLimits } from '../lib/limits';
import { useStorageListener, isUsageOrSettingsKey } from '../hooks/useStorageListener';
import { AppSettings, Platform } from '../types';
import { StorageService } from '../storage';

interface OverlayProps {
    platform?: Platform;
}

const POSITION_KEY = 'focusOverlayPosition';

function loadSavedPosition(): { x: number; y: number } | null {
    try {
        const raw = localStorage.getItem(POSITION_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') return parsed;
        return null;
    } catch {
        return null;
    }
}

function savePosition(x: number, y: number) {
    try {
        localStorage.setItem(POSITION_KEY, JSON.stringify({ x, y }));
    } catch {
        /* non-critical */
    }
}

export const Overlay = ({ platform = 'youtube' }: OverlayProps) => {
    const [time, setTime] = useState(0);
    const [sessionSeconds, setSessionSeconds] = useState(0);
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [progress, setProgress] = useState<number | null>(null);
    const [visible, setVisible] = useState(true);

    // Drag state
    const saved = loadSavedPosition();
    const [pos, setPos] = useState<{ x: number; y: number }>(
        saved ?? { x: window.innerWidth - 160, y: 12 }
    );
    const dragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    const syncFromStorage = useCallback(async () => {
        const [usage, currentSettings, cooldownUntil] = await Promise.all([
            StorageService.getTodayUsage(),
            StorageService.getSettings(),
            StorageService.getCooldownUntil(platform),
        ]);
        setTime(usage.byPlatform[platform] || 0);
        setSettings(currentSettings);

        const host = document.getElementById('focus-overlay-host');
        const session = parseInt(host?.dataset.sessionSeconds || '0', 10);
        setSessionSeconds(session);

        const state = evaluateLimits(platform, currentSettings, usage.byPlatform[platform] || 0, session, cooldownUntil);
        if (state.effectiveDailyLimit > 0) {
            setProgress(
                Math.min(100, Math.round((state.dailyUsage / state.effectiveDailyLimit) * 100))
            );
        } else {
            setProgress(null);
        }
    }, [platform]);

    useEffect(() => {
        chrome.runtime.sendMessage({ type: 'FLUSH_USAGE' }).catch(() => { });
        void syncFromStorage();
    }, [syncFromStorage]);

    useStorageListener(syncFromStorage, isUsageOrSettingsKey);

    // Optimistic tick (corrected on every storage sync)
    useEffect(() => {
        const tick = () => {
            const host = document.getElementById('focus-overlay-host');
            const session = parseInt(host?.dataset.sessionSeconds || '0', 10);
            setSessionSeconds(session);
            if (host?.dataset.isActive === 'true') setTime((t) => t + 1);
        };
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    // Keyboard: Escape dismisses
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setVisible(false);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    // Drag handlers (pointer events — works on touch + mouse)
    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        // Only drag on left-click / primary touch, not on close button
        if ((e.target as HTMLElement).closest('button')) return;
        dragging.current = true;
        dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        e.preventDefault();
    };

    const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragging.current) return;
        const W = window.innerWidth;
        const H = window.innerHeight;
        const WIDGET_W = 152;
        const WIDGET_H = 80;
        const newX = Math.max(0, Math.min(W - WIDGET_W, e.clientX - dragOffset.current.x));
        const newY = Math.max(0, Math.min(H - WIDGET_H, e.clientY - dragOffset.current.y));
        setPos({ x: newX, y: newY });
        e.preventDefault();
    };

    const onPointerUp = () => {
        if (!dragging.current) return;
        dragging.current = false;
        savePosition(pos.x, pos.y);
    };

    if (!settings || !visible) return null;

    const sessionLimit = settings.sessionLimits[platform] || 0;

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}h ${m}m`;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const barColor =
        progress === null
            ? 'hsl(220 65% 60%)'
            : progress >= 100
                ? 'hsl(0 72% 58%)'
                : progress >= 80
                    ? 'hsl(38 95% 55%)'
                    : 'hsl(220 65% 60%)';

    return (
        <div
            role="status"
            aria-label={`${platform} usage: ${formatTime(time)} today`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{
                position: 'fixed',
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                zIndex: 2147483647,
                background: 'rgba(10,15,28,0.93)',
                color: '#e8ecf4',
                borderRadius: '10px',
                boxShadow: '0 2px 16px rgba(0,0,0,0.5)',
                fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
                fontSize: '13px',
                padding: '10px 12px',
                width: '152px',
                userSelect: 'none',
                cursor: dragging.current ? 'grabbing' : 'grab',
                touchAction: 'none',
            }}
        >
            {/* Header row: label + close button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(232,236,244,0.45)' }}>
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </span>
                <button
                    type="button"
                    onClick={() => setVisible(false)}
                    aria-label="Dismiss overlay"
                    title="Dismiss (Esc)"
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(232,236,244,0.4)',
                        cursor: 'pointer',
                        padding: '0 0 0 6px',
                        fontSize: '14px',
                        lineHeight: 1,
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    ×
                </button>
            </div>

            {/* Today time */}
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '4px', marginBottom: sessionLimit > 0 ? '5px' : progress !== null ? '6px' : '0' }}>
                <span style={{ color: 'rgba(232,236,244,0.5)', fontSize: '11px' }}>Today</span>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: '15px', letterSpacing: '-0.01em' }}>
                    {formatTime(time)}
                </span>
            </div>

            {/* Session row */}
            {sessionLimit > 0 && (
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '4px', marginBottom: progress !== null ? '6px' : '0' }}>
                    <span style={{ color: 'rgba(232,236,244,0.35)', fontSize: '10px' }}>Session</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '12px', color: 'rgba(232,236,244,0.65)' }}>
                        {formatTime(sessionSeconds)}
                    </span>
                </div>
            )}

            {/* Progress bar */}
            {progress !== null && (
                <div style={{ height: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div
                        style={{
                            height: '100%',
                            width: `${progress}%`,
                            background: barColor,
                            borderRadius: '2px',
                            transition: 'width 0.8s ease, background 0.5s ease',
                        }}
                    />
                </div>
            )}
        </div>
    );
};
