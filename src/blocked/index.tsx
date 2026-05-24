import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getBlockState, type BlockState } from '../storage/blockState';
import { PLATFORM_BY_ID } from '../lib/platforms/registry';
import '../index.css';

function formatCountdown(untilMs: number): string {
    const sec = Math.max(0, Math.ceil((untilMs - Date.now()) / 1000));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

function reasonLabel(reason: BlockState['reason']): string {
    switch (reason) {
        case 'daily':
            return 'Daily limit reached';
        case 'session':
            return 'Session limit reached';
        case 'cooldown':
            return 'Cooldown active';
        default:
            return 'Limit reached';
    }
}

function reasonDetail(reason: BlockState['reason']): string {
    switch (reason) {
        case 'daily':
            return 'You have used all of your allowed active time for today on this site. Limits reset at local midnight.';
        case 'session':
            return 'You hit your continuous session cap. Take a break before starting a new session.';
        case 'cooldown':
            return 'You cannot return to this site until the cooldown ends.';
        default:
            return '';
    }
}

const BlockedPage = () => {
    const [state, setState] = useState<BlockState | null>(null);
    const [countdown, setCountdown] = useState('');

    useEffect(() => {
        getBlockState().then(setState);
    }, []);

    useEffect(() => {
        if (!state) return;
        const tick = () => setCountdown(formatCountdown(state.until));
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [state]);

    if (!state) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-600">
                Loading…
            </main>
        );
    }

    const label = PLATFORM_BY_ID[state.platform]?.label ?? state.platform;

    return (
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-6 font-sans">
            <article className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
                <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-amber-100 flex items-center justify-center text-2xl">
                    ⏱
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{reasonLabel(state.reason)}</h1>
                <p className="text-sm text-gray-500 mb-6 capitalize">{label}</p>
                <p className="text-gray-600 text-sm leading-relaxed mb-6">{reasonDetail(state.reason)}</p>
                <div className="bg-gray-50 rounded-xl py-4 px-6 mb-6">
                    <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Time remaining</p>
                    <p className="text-3xl font-mono font-bold text-gray-900">{countdown}</p>
                </div>
                <p className="text-xs text-gray-400">
                    FocusOverlay — no snooze. Limit increases are locked until this period ends.
                </p>
            </article>
        </main>
    );
};

createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BlockedPage />
    </React.StrictMode>
);
