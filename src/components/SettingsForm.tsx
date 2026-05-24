import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Save, Lock } from 'lucide-react';
import { StorageService } from '../storage';
import { getModeOptionsForPlatform, PLATFORM_BY_ID } from '../lib/platforms/registry';
import { describeEveningWindow } from '../lib/scheduleHelp';
import { AppSettings, Platform, TRACKED_PLATFORMS, TrackingMode } from '../types';
import { DurationInput } from './DurationInput';

function formatLockUntil(ts: number): string {
    return new Date(ts).toLocaleString();
}

export const SettingsForm = () => {
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [locks, setLocks] = useState<Awaited<ReturnType<typeof StorageService.getLimitLocks>> | null>(
        null
    );
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

    useEffect(() => {
        load();
    }, [load]);

    const setLimitSeconds = (
        field: 'limits' | 'sessionLimits',
        platform: Platform,
        totalMinutes: number
    ) => {
        if (!settings) return;
        setSettings({
            ...settings,
            [field]: { ...settings[field], [platform]: totalMinutes * 60 },
        });
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
            setMessage({
                type: 'error',
                text: `${result.error} (${result.lockedPlatforms.join(', ')})`,
            });
            await load();
        }
        setTimeout(() => setMessage(null), 5000);
    };

    if (!settings || !locks) {
        return <p className="text-gray-500">Loading…</p>;
    }

    const now = Date.now();
    const isDailyLocked = (p: Platform) => StorageService.isPlatformDailyLocked(p, locks, now);
    const isSessionLocked = (p: Platform) => StorageService.isPlatformSessionLocked(p, locks, now);

    return (
        <div className="space-y-8 max-w-2xl">
            {message && (
                <div
                    className={`p-3 rounded-lg text-sm ${message.type === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}
                >
                    {message.text}
                </div>
            )}

            <section className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h2 className="text-sm font-bold text-gray-900">Bulk actions</h2>
                <div className="flex flex-wrap gap-4 items-end">
                    <div>
                        <p className="text-xs text-gray-500 mb-1">Set daily limit for all</p>
                        <DurationInput totalMinutes={0} onChange={applyDailyToAll} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 mb-1">Set session limit for all</p>
                        <DurationInput totalMinutes={0} onChange={applySessionToAll} />
                    </div>
                </div>
            </section>

            <section className="space-y-2">
                <h2 className="text-lg font-bold text-gray-900">Per-site limits</h2>
                <p className="text-sm text-gray-500">
                    Expand a site to edit daily limit, session limit, and tracking mode.
                </p>
                {TRACKED_PLATFORMS.map((p) => {
                    const isOpen = expanded === p;
                    const def = PLATFORM_BY_ID[p];
                    return (
                        <div
                            key={p}
                            className="border border-gray-200 rounded-xl overflow-hidden bg-white"
                        >
                            <button
                                type="button"
                                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 text-left"
                                onClick={() => setExpanded(isOpen ? null : p)}
                            >
                                <span className="font-semibold text-gray-900">{def.label}</span>
                                <ChevronDown
                                    size={18}
                                    className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                />
                            </button>
                            {isOpen && (
                                <div className="px-4 pb-4 space-y-4 border-t border-gray-100">
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
                                    <label className="block text-sm">
                                        <span className="font-medium text-gray-800">Tracking mode</span>
                                        <select
                                            className="mt-1 w-full border border-gray-300 rounded-lg p-2 text-sm"
                                            value={settings.trackingMode[p]}
                                            onChange={(e) =>
                                                setSettings({
                                                    ...settings,
                                                    trackingMode: {
                                                        ...settings.trackingMode,
                                                        [p]: e.target.value as TrackingMode,
                                                    },
                                                })
                                            }
                                        >
                                            {getModeOptionsForPlatform(p).map((o) => (
                                                <option key={o.value} value={o.value}>
                                                    {o.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    {settings.schedule.enabled && (
                                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                                            <ScheduleCap
                                                label="Evening cap"
                                                minutes={settings.schedule.eveningLimits[p]}
                                                locked={isDailyLocked(p)}
                                                onChange={(m) =>
                                                    setSettings({
                                                        ...settings,
                                                        schedule: {
                                                            ...settings.schedule,
                                                            eveningLimits: {
                                                                ...settings.schedule.eveningLimits,
                                                                [p]: m,
                                                            },
                                                        },
                                                    })
                                                }
                                            />
                                            <ScheduleCap
                                                label="Weekend cap"
                                                minutes={settings.schedule.weekendLimits[p]}
                                                locked={isDailyLocked(p)}
                                                onChange={(m) =>
                                                    setSettings({
                                                        ...settings,
                                                        schedule: {
                                                            ...settings.schedule,
                                                            weekendLimits: {
                                                                ...settings.schedule.weekendLimits,
                                                                [p]: m,
                                                            },
                                                        },
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
            </section>

            <section className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900">Scheduled limits</h2>
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={settings.schedule.enabled}
                        onChange={(e) =>
                            setSettings({
                                ...settings,
                                schedule: { ...settings.schedule, enabled: e.target.checked },
                            })
                        }
                    />
                    Stricter caps on evenings and weekends
                </label>
                {settings.schedule.enabled && (
                    <div className="space-y-3 pl-1 border-l-2 border-gray-200 ml-1 text-sm">
                        <p className="text-gray-600">{describeEveningWindow(settings.schedule)}</p>
                        <div className="flex flex-wrap gap-4 items-center">
                            <label>
                                From{' '}
                                <input
                                    type="number"
                                    min={0}
                                    max={23}
                                    className="w-14 border rounded px-2 py-1 ml-1"
                                    value={settings.schedule.eveningStartHour}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            schedule: {
                                                ...settings.schedule,
                                                eveningStartHour: +e.target.value,
                                            },
                                        })
                                    }
                                />
                            </label>
                            <label>
                                To{' '}
                                <input
                                    type="number"
                                    min={0}
                                    max={23}
                                    className="w-14 border rounded px-2 py-1 ml-1"
                                    value={settings.schedule.eveningEndHour}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            schedule: {
                                                ...settings.schedule,
                                                eveningEndHour: +e.target.value,
                                            },
                                        })
                                    }
                                />
                            </label>
                        </div>
                        <p className="text-xs text-gray-500">
                            0 on a per-site evening/weekend cap uses the base daily limit. When both
                            apply, the lower cap wins.
                        </p>
                    </div>
                )}
            </section>

            <section className="space-y-2">
                <h2 className="text-lg font-bold text-gray-900">Cooldown</h2>
                <p className="text-sm text-gray-500">
                    After a block, revisit is prevented for this long (blocked page shown).
                </p>
                <DurationInput
                    totalMinutes={settings.cooldownMinutes}
                    onChange={(m) => setSettings({ ...settings, cooldownMinutes: m || 15 })}
                />
            </section>

            <button
                type="button"
                disabled={saving}
                onClick={save}
                className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50"
            >
                <Save size={18} />
                {saving ? 'Saving…' : 'Save settings'}
            </button>
        </div>
    );
};

function LimitField({
    label,
    totalMinutes,
    locked,
    lockUntil,
    onChange,
}: {
    label: string;
    totalMinutes: number;
    locked?: boolean;
    lockUntil?: number;
    onChange: (minutes: number) => void;
}) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
                <p className="text-sm font-medium text-gray-800">{label}</p>
                {locked && lockUntil && (
                    <p className="text-xs text-amber-700 flex items-center gap-1 mt-0.5">
                        <Lock size={12} />
                        Increases locked until {formatLockUntil(lockUntil)}
                    </p>
                )}
            </div>
            <DurationInput totalMinutes={totalMinutes} onChange={onChange} disabled={locked} />
        </div>
    );
}

function ScheduleCap({
    label,
    minutes,
    locked,
    onChange,
}: {
    label: string;
    minutes: number;
    locked?: boolean;
    onChange: (minutes: number) => void;
}) {
    return (
        <label className="text-xs block">
            <span className="text-gray-600">{label}</span>
            <input
                type="number"
                min={0}
                disabled={locked}
                className="mt-1 w-full border rounded p-2 font-mono disabled:opacity-50"
                value={minutes}
                onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
            />
        </label>
    );
}
