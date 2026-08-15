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
        case 'daily': return "You've hit your daily limit";
        case 'session': return "Session limit reached";
        case 'cooldown': return "Cooldown in progress";
        default: return "Access paused";
    }
}

function reasonDetail(reason: BlockState['reason']): string {
    switch (reason) {
        case 'daily': return 'Your active time on this site has run out for today. Limits reset at midnight.';
        case 'session': return 'You have been browsing continuously past your session cap. Take a real break.';
        case 'cooldown': return 'A brief cooldown prevents immediate return. The timer below shows when access resumes.';
        default: return '';
    }
}

import { Logo } from '../components/Logo';

const BlockedPage = () => {
    const [state, setState] = useState<BlockState | null>(null);
    const [loading, setLoading] = useState(true);
    const [countdown, setCountdown] = useState('');

    useEffect(() => {
        getBlockState().then((s) => {
            setState(s);
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        if (!state) return;
        const tick = () => setCountdown(formatCountdown(state.until));
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [state]);

    const openSettings = () => chrome.runtime.openOptionsPage();

    if (loading) {
        return (
            <main className="blocked-root">
                <div className="blocked-card" style={{ color: 'var(--c-muted)' }}>Loading…</div>
            </main>
        );
    }

    if (!state) {
        return (
            <main className="blocked-root">
                <div className="blocked-card">
                    <p style={{ color: 'var(--c-muted)', fontSize: '14px' }}>
                        No block state found. You can{' '}
                        <button className="link-btn" onClick={openSettings}>open settings</button>.
                    </p>
                </div>
            </main>
        );
    }

    const label = PLATFORM_BY_ID[state.platform]?.label ?? state.platform;

    return (
        <main className="blocked-root">
            <article className="blocked-card" role="main" aria-label={`${label} is blocked`}>
                <div className="blocked-logo" aria-hidden="true" style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                    <Logo size={40} />
                </div>

                <div className="blocked-platform">{label}</div>
                <h1 className="blocked-title">{reasonLabel(state.reason)}</h1>
                <p className="blocked-detail">{reasonDetail(state.reason)}</p>

                <div className="blocked-timer" aria-live="off" aria-atomic="true">
                    <div className="blocked-timer-label">Resumes in</div>
                    <output className="blocked-timer-value">{countdown}</output>
                </div>

                <button
                    type="button"
                    className="blocked-settings-btn"
                    onClick={openSettings}
                >
                    View usage &amp; settings
                </button>
            </article>
        </main>
    );
};

createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BlockedPage />
    </React.StrictMode>
);
