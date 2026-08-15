import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';

import { Logo } from '../components/Logo';

const STEPS = [
    {
        id: 'welcome',
        title: 'Take back your time.',
        body: 'FeedBlocker tracks how long you spend on YouTube, Instagram, TikTok, and 6 more sites — then cuts you off when you hit your limit. No account. No cloud. All data stays on your machine.',
        cta: 'Get started →',
    },
    {
        id: 'pin',
        title: 'Pin the extension.',
        body: 'Click the puzzle icon in your Chrome toolbar, then pin FeedBlocker. You\'ll see today\'s total minutes right in the toolbar badge.',
        cta: 'Done, continue →',
    },
    {
        id: 'set',
        title: 'Set your first limit.',
        body: 'Open Settings and pick a daily limit for any site. Start with something realistic — you can always tighten it later. Limits lock when hit so you can\'t cheat in the moment.',
        cta: 'Open settings →',
        action: () => chrome.runtime.openOptionsPage(),
    },
];

const OnboardingPage = () => {
    const [step, setStep] = useState(0);
    const current = STEPS[step];

    const handleCta = () => {
        if (current.action) {
            current.action();
            return;
        }
        if (step < STEPS.length - 1) {
            setStep((s) => s + 1);
        }
    };

    return (
        <main style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--c-bg)',
            padding: '24px',
        }}>
            <article style={{
                background: 'var(--c-surface)',
                border: '1px solid var(--c-border)',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                padding: '48px 44px',
                maxWidth: '500px',
                width: '100%',
                textAlign: 'center',
            }}>
                {/* Logo */}
                <div style={{ color: 'var(--c-accent)', marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
                    <Logo size={48} />
                </div>

                {/* Step dots */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '32px' }}>
                    {STEPS.map((_, i) => (
                        <div
                            key={i}
                            style={{
                                width: i === step ? '20px' : '6px',
                                height: '6px',
                                borderRadius: '3px',
                                background: i === step ? 'var(--c-accent)' : 'var(--c-border)',
                                transition: 'all 0.3s ease',
                            }}
                        />
                    ))}
                </div>

                <h1 style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: 'var(--c-text)',
                    letterSpacing: '-0.02em',
                    marginBottom: '14px',
                    lineHeight: 1.2,
                }}>
                    {current.title}
                </h1>

                <p style={{
                    fontSize: '15px',
                    color: 'var(--c-muted)',
                    lineHeight: 1.7,
                    marginBottom: '36px',
                }}>
                    {current.body}
                </p>

                <button
                    type="button"
                    onClick={handleCta}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '12px 28px',
                        background: 'var(--c-accent)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'opacity 0.15s',
                    }}
                    onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.88'; }}
                    onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                >
                    {current.cta}
                </button>

                <p style={{ marginTop: '20px', fontSize: '12px', color: 'var(--c-subtle)' }}>
                    FeedBlocker — all data stored locally. No account required.
                </p>
            </article>
        </main>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <OnboardingPage />
    </React.StrictMode>
);
