import { useState } from 'react';
import { Download } from 'lucide-react';
import { SettingsForm } from '../components/SettingsForm';
import { StorageService } from '../storage';
import { Dashboard } from '../popup/Dashboard';
import '../index.css';

function downloadCsv(filename: string, content: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// Minimal SVG logo mark
const LogoMark = ({ size = 22 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="options-logo-mark">
        <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2.5" />
        <path d="M16 16 L16 3 A13 13 0 0 1 27.26 22.5 Z" fill="currentColor" opacity="0.85" />
        <circle cx="16" cy="16" r="2" fill="currentColor" />
    </svg>
);

type Tab = 'usage' | 'limits' | 'data';

export const OptionsApp = () => {
    const [tab, setTab] = useState<Tab>('usage');
    const [resetConfirm, setResetConfirm] = useState(false);

    const exportCsv = async () => {
        const csv = await StorageService.exportUsageCsv();
        downloadCsv(`focusoverlay-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    };

    const resetToday = async () => {
        if (!resetConfirm) { setResetConfirm(true); return; }
        await StorageService.resetTodayUsage();
        setResetConfirm(false);
        window.location.reload();
    };

    return (
        <div className="options-root">
            <header className="options-header">
                <LogoMark />
                <span className="options-title">FocusOverlay</span>
                <span className="options-subtitle">All data is stored locally — nothing leaves your browser.</span>
            </header>

            <nav className="options-tabs" aria-label="Settings sections">
                {(['usage', 'limits', 'data'] as Tab[]).map((t) => (
                    <button
                        key={t}
                        type="button"
                        role="tab"
                        aria-selected={tab === t}
                        className={`options-tab${tab === t ? ' active' : ''}`}
                        onClick={() => setTab(t)}
                    >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                ))}
            </nav>

            <main className="options-main" role="tabpanel" aria-label={tab}>
                {tab === 'usage' && (
                    <div className="options-card">
                        <h2 className="options-card-title">Today&apos;s usage</h2>
                        <Dashboard />
                    </div>
                )}

                {tab === 'limits' && (
                    <div className="options-card">
                        <SettingsForm />
                    </div>
                )}

                {tab === 'data' && (
                    <div className="options-card">
                        <h2 className="options-card-title">Data</h2>
                        <p className="field-hint" style={{ marginBottom: '16px' }}>
                            Export your usage history as CSV, or reset today&apos;s stats.
                            All data is local — no account required.
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                            <button type="button" onClick={exportCsv} className="btn-primary">
                                <Download size={14} aria-hidden="true" />
                                Export usage (CSV)
                            </button>

                            {!resetConfirm ? (
                                <button type="button" onClick={resetToday} className="btn-ghost">
                                    Reset today&apos;s stats
                                </button>
                            ) : (
                                <div className="inline-confirm" role="group" aria-label="Confirm reset">
                                    <span className="inline-confirm-msg">This cannot be undone.</span>
                                    <button type="button" className="btn-danger" onClick={resetToday}>
                                        Confirm reset
                                    </button>
                                    <button type="button" className="btn-ghost" onClick={() => setResetConfirm(false)}>
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
