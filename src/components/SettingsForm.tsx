import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Lock, Save } from 'lucide-react';
import { StorageService } from '../storage';
import { getModeOptionsForPlatform, PLATFORM_BY_ID } from '../lib/platforms/registry';
import { describeEveningWindow } from '../lib/scheduleHelp';
import { AppSettings, Platform, TRACKED_PLATFORMS, TrackingMode } from '../types';
import { DurationInput } from './DurationInput';

function formatLockUntil(ts: number): string {
    return new Date(ts).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

export const SettingsForm = () => {
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [locks, setLocks] = useState<Awaited<ReturnType<typeof StorageService.getLimitLocks>> | null>(null);
    const [expanded, setExpanded] = useState<Platform | null>('youtube');
    const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        const [s, l] = await Promise.all([
            StorageService.getSettings(),
            StorageService.getLimitLocks(),
        ]);
        setSettings(s);
        setLocks(l);
    }, []);

    useEffect(() => { load(); }, [load]);

    const setLimitSeconds = (field: 'limits' | 'sessionLimits', platform: Platform, totalMinutes: number) => {
        if (!settings) return;
        setSettings({ ...settings, [field]: { ...settings[field], [platform]: totalMinutes * 60 } });
    };

    const applyDailyToAll = (totalMinutes: number) => {
        if (!settings) return;
        const next = { ...settings.limits };
        for (const p of TRACKED_PLATFORMS) next[p] = totalMinutes * 60;
        setSettings({ ...settings, limits: next });
    };

    const applySessionToAll = (totalMinutes: number) => {
        if (!settings) return;
        const next = { ...settings.sessionLimits };
        for (const p of TRACKED_PLATFORMS) next[p] = totalMinutes * 60;
        setSettings({ ...settings, sessionLimits: next });
    };

    const save = async () => {
        if (!settings) return;
        setSaving(true);
        const result = await StorageService.saveSettings(settings);
        setSaving(false);
        if (result.ok) {
            setMessage({ type: 'ok', text: 'Settings saved.' });
            await load();
        } else {
            setMessage({ type: 'error', text: `${result.error} (${result.lockedPlatforms.join(', ')})` });
            await load();
        }
        setTimeout(() => setMessage(null), 5000);
    };

    if (!settings || !locks) return <p className="field-hint">Loading…</p>;

    const now = Date.now();
    const isDailyLocked = (p: Platform) => StorageService.isPlatformDailyLocked(p, locks, now);
    const isSessionLocked = (p: Platform) => StorageService.isPlatformSessionLocked(p, locks, now);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {message && (
                <div className={message.type === 'ok' ? 'alert alert-ok' : 'alert alert-error'} role="alert">
                    {message.text}
                </div>
            )}

            {/* Bulk actions */}
            <section aria-labelledby="bulk-heading">
                <h2 id="bulk-heading" className="options-card-title" style={{ fontSize: '13px', marginBottom: '12px' }}>
                    Set all sites at once
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
                    <div>
                        <p className="field-hint" style={{ marginBottom: '6px' }}>Daily limit for all</p>
                        <DurationInput totalMinutes={0} onChange={applyDailyToAll} />
                    </div>
                    <div>
                        <p className="field-hint" style={{ marginBottom: '6px' }}>Session limit for all</p>
                        <DurationInput totalMinutes={0} onChange={applySessionToAll} />
                    </div>
                </div>
            </section>

            {/* Per-site accordion */}
            <section aria-labelledby="persite-heading">
                <h2 id="persite-heading" className="options-card-title">Per-site limits</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {TRACKED_PLATFORMS.map((p) => {
                        const isOpen = expanded === p;
                        const def = PLATFORM_BY_ID[p];
                        return (
                            <div key={p} className="accordion-item">
                                <button
                                    type="button"
                                    className="accordion-btn"
                                    aria-expanded={isOpen}
                                    aria-controls={`accordion-${p}`}
                                    onClick={() => setExpanded(isOpen ? null : p)}
                                >
                                    <span>{def.label}</span>
                                    <ChevronDown
                                        size={16}
                                        className={`accordion-chevron${isOpen ? ' open' : ''}`}
                                        aria-hidden="true"
                                    />
                                </button>
                                {isOpen && (
                                    <div id={`accordion-${p}`} className="accordion-body">
                                        <LimitField
                                            label="Daily limit"
                                            totalMinutes={Math.floor(settings.limits[p] / 60)}
                                            locked={isDailyLocked(p)}
                                            lockUntil={locks.daily[p]}
                                            onChange={(m) => setLimitSeconds('limits', p, m)}
                                        />
                                        <LimitField
                                            label="Session limit"
                                            totalMinutes={Math.floor(settings.sessionLimits[p] / 60)}
                                            locked={isSessionLocked(p)}
                                            lockUntil={locks.session[p]}
                                            onChange={(m) => setLimitSeconds('sessionLimits', p, m)}
                                        />
                                        <div className="field-row">
                                            <div>
                                                <label htmlFor={`mode-${p}`} className="field-label">Tracking mode</label>
                                            </div>
                                            <select
                                                id={`mode-${p}`}
                                                value={settings.trackingMode[p]}
                                                onChange={(e) =>
                                                    setSettings({
                                                        ...settings,
                                                        trackingMode: { ...settings.trackingMode, [p]: e.target.value as TrackingMode },
                                                    })
                                                }
                                            >
                                                {getModeOptionsForPlatform(p).map((o) => (
                                                    <option key={o.value} value={o.value}>{o.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {settings.schedule.enabled && (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--c-border)', marginTop: '4px' }}>
                                                <ScheduleCap
                                                    label="Evening cap (min)"
                                                    minutes={settings.schedule.eveningLimits[p]}
                                                    locked={isDailyLocked(p)}
                                                    onChange={(m) =>
                                                        setSettings({
                                                            ...settings,
                                                            schedule: { ...settings.schedule, eveningLimits: { ...settings.schedule.eveningLimits, [p]: m } },
                                                        })
                                                    }
                                                />
                                                <ScheduleCap
                                                    label="Weekend cap (min)"
                                                    minutes={settings.schedule.weekendLimits[p]}
                                                    locked={isDailyLocked(p)}
                                                    onChange={(m) =>
                                                        setSettings({
                                                            ...settings,
                                                            schedule: { ...settings.schedule, weekendLimits: { ...settings.schedule.weekendLimits, [p]: m } },
                                                        })
                                                    }
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Schedule */}
            <section aria-labelledby="schedule-heading">
                <h2 id="schedule-heading" className="options-card-title">Scheduled limits</h2>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={settings.schedule.enabled}
                        onChange={(e) =>
                            setSettings({ ...settings, schedule: { ...settings.schedule, enabled: e.target.checked } })
                        }
                    />
                    Stricter caps on evenings and weekends
                </label>
                {settings.schedule.enabled && (
                    <div style={{ marginTop: '12px', paddingLeft: '10px', borderLeft: '2px solid var(--c-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <p className="field-hint">{describeEveningWindow(settings.schedule)}</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                            <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                From
                                <input
                                    type="number" min={0} max={23} style={{ width: '56px' }}
                                    value={settings.schedule.eveningStartHour}
                                    onChange={(e) =>
                                        setSettings({ ...settings, schedule: { ...settings.schedule, eveningStartHour: +e.target.value } })
                                    }
                                />
                                <span className="field-hint">h</span>
                            </label>
                            <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                To
                                <input
                                    type="number" min={0} max={23} style={{ width: '56px' }}
                                    value={settings.schedule.eveningEndHour}
                                    onChange={(e) =>
                                        setSettings({ ...settings, schedule: { ...settings.schedule, eveningEndHour: +e.target.value } })
                                    }
                                />
                                <span className="field-hint">h</span>
                            </label>
                        </div>
                        <p className="field-hint">0 on a per-site cap uses the base daily limit. When both apply, the lower wins.</p>
                    </div>
                )}
            </section>

            {/* Cooldown */}
            <section aria-labelledby="cooldown-heading">
                <h2 id="cooldown-heading" className="options-card-title">Cooldown</h2>
                <p className="field-hint" style={{ marginBottom: '10px' }}>After a block, this site stays blocked for this long.</p>
                <DurationInput
                    totalMinutes={settings.cooldownMinutes}
                    onChange={(m) => setSettings({ ...settings, cooldownMinutes: m || 15 })}
                />
            </section>

            <button type="button" disabled={saving} onClick={save} className="btn-primary" style={{ alignSelf: 'flex-start' }}>
                <Save size={15} aria-hidden="true" />
                {saving ? 'Saving…' : 'Save settings'}
            </button>
        </div>
    );
};

function LimitField({ label, totalMinutes, locked, lockUntil, onChange }: {
    label: string; totalMinutes: number; locked?: boolean; lockUntil?: number;
    onChange: (minutes: number) => void;
}) {
    return (
        <div className="field-row">
            <div>
                <p className="field-label">{label}</p>
                {locked && lockUntil && (
                    <p className="lock-badge">
                        <Lock size={11} aria-hidden="true" />
                        Locked until {formatLockUntil(lockUntil)}
                    </p>
                )}
            </div>
            <DurationInput totalMinutes={totalMinutes} onChange={onChange} disabled={locked} />
        </div>
    );
}

function ScheduleCap({ label, minutes, locked, onChange }: {
    label: string; minutes: number; locked?: boolean; onChange: (m: number) => void;
}) {
    return (
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
            <span className="field-hint">{label}</span>
            <input
                type="number" min={0} disabled={locked}
                value={minutes}
                onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
            />
        </label>
    );
}
