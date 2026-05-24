import { useEffect, useState } from 'react';
import { Save, Lock } from 'lucide-react';
import { StorageService } from '../storage';
import { getModeOptionsForPlatform } from '../lib/platforms/registry';
import { AppSettings, Platform, TRACKED_PLATFORMS, TrackingMode } from '../types';

function formatLockUntil(ts: number): string {
    return new Date(ts).toLocaleString();
}

export const SettingsForm = () => {
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [locks, setLocks] = useState<Awaited<ReturnType<typeof StorageService.getLimitLocks>> | null>(
        null
    );
    const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        const [s, l] = await Promise.all([
            StorageService.getSettings(),
            StorageService.getLimitLocks(),
        ]);
        setSettings(s);
        setLocks(l);
    };

    useEffect(() => {
        load();
    }, []);

    const setLimit = (
        field: 'limits' | 'sessionLimits',
        platform: Platform,
        minutes: number
    ) => {
        if (!settings) return;
        setSettings({
            ...settings,
            [field]: { ...settings[field], [platform]: minutes * 60 },
        });
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

    const isDailyLocked = (p: Platform) =>
        StorageService.isPlatformDailyLocked(p, locks, now);
    const isSessionLocked = (p: Platform) =>
        StorageService.isPlatformSessionLocked(p, locks, now);

    return (
        <div className="space-y-8 max-w-2xl">
            {message && (
                <div
                    className={`p-3 rounded-lg text-sm ${message.type === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}
                >
                    {message.text}
                </div>
            )}

            <section className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900">Daily limits</h2>
                <p className="text-sm text-gray-500">
                    Max active time per day. Hitting the limit sends the tab to a blank page and
                    locks limit increases until midnight.
                </p>
                {TRACKED_PLATFORMS.map((p) => (
                    <LimitRow
                        key={`d-${p}`}
                        platform={p}
                        minutes={Math.floor(settings.limits[p] / 60)}
                        locked={isDailyLocked(p)}
                        lockUntil={locks.daily[p]}
                        onChange={(m) => setLimit('limits', p, m)}
                    />
                ))}
            </section>

            <section className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900">Session limits</h2>
                <p className="text-sm text-gray-500">
                    Max continuous active time per visit. Resets after 5 minutes idle. Locks
                    session limit increases until the session resets.
                </p>
                {TRACKED_PLATFORMS.map((p) => (
                    <LimitRow
                        key={`s-${p}`}
                        platform={p}
                        minutes={Math.floor(settings.sessionLimits[p] / 60)}
                        locked={isSessionLocked(p)}
                        lockUntil={locks.session[p]}
                        onChange={(m) => setLimit('sessionLimits', p, m)}
                    />
                ))}
            </section>

            <section className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900">Tracking mode</h2>
                <p className="text-sm text-gray-500">
                    Controls what content counts toward limits. Video detection uses visible
                    playback in the viewport.
                </p>
                <div className="space-y-3">
                    {TRACKED_PLATFORMS.map((p) => (
                        <ModeSelect
                            key={`mode-${p}`}
                            platform={p}
                            value={settings.trackingMode[p]}
                            options={getModeOptionsForPlatform(p)}
                            onChange={(v) =>
                                setSettings({
                                    ...settings,
                                    trackingMode: { ...settings.trackingMode, [p]: v },
                                })
                            }
                        />
                    ))}
                </div>
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
                    Enable stricter caps on evenings and weekends
                </label>
                {settings.schedule.enabled && (
                    <div className="space-y-4 pl-1 border-l-2 border-gray-200 ml-1">
                        <div className="flex gap-4 flex-wrap">
                            <label className="text-sm">
                                Evening from{' '}
                                <input
                                    type="number"
                                    min={0}
                                    max={23}
                                    className="w-14 border rounded px-2 py-1"
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
                                />{' '}
                                to{' '}
                                <input
                                    type="number"
                                    min={0}
                                    max={23}
                                    className="w-14 border rounded px-2 py-1"
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
                            During overlapping evening + weekend, the lower cap applies. 0 = use
                            base daily limit.
                        </p>
                        <h3 className="text-sm font-semibold">Evening caps (minutes)</h3>
                        {TRACKED_PLATFORMS.map((p) => (
                            <LimitRow
                                key={`ev-${p}`}
                                platform={p}
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
                        ))}
                        <h3 className="text-sm font-semibold">Weekend caps (minutes)</h3>
                        {TRACKED_PLATFORMS.map((p) => (
                            <LimitRow
                                key={`we-${p}`}
                                platform={p}
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
                        ))}
                    </div>
                )}
            </section>

            <section className="space-y-2">
                <h2 className="text-lg font-bold text-gray-900">Cooldown</h2>
                <p className="text-sm text-gray-500">
                    After a block, you cannot revisit the site for this many minutes.
                </p>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        min={1}
                        max={120}
                        className="w-20 border rounded-lg px-2 py-2 font-mono"
                        value={settings.cooldownMinutes}
                        onChange={(e) =>
                            setSettings({
                                ...settings,
                                cooldownMinutes: parseInt(e.target.value, 10) || 15,
                            })
                        }
                    />
                    <span className="text-sm text-gray-500">minutes</span>
                </div>
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

function LimitRow({
    platform,
    minutes,
    locked,
    lockUntil,
    onChange,
}: {
    platform: Platform;
    minutes: number;
    locked?: boolean;
    lockUntil?: number;
    onChange: (minutes: number) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div>
                <span className="capitalize font-medium text-gray-800">{platform}</span>
                {locked && lockUntil && (
                    <p className="text-xs text-amber-700 flex items-center gap-1 mt-0.5">
                        <Lock size={12} />
                        Increases locked until {formatLockUntil(lockUntil)}
                    </p>
                )}
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="number"
                    min={0}
                    className="w-20 p-2 border border-gray-300 rounded-lg text-right font-mono text-sm"
                    value={minutes}
                    onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
                />
                <span className="text-sm text-gray-500">min</span>
            </div>
        </div>
    );
}

function ModeSelect({
    platform,
    value,
    options,
    onChange,
}: {
    platform: Platform;
    value: TrackingMode;
    options: { value: TrackingMode; label: string }[];
    onChange: (v: TrackingMode) => void;
}) {
    return (
        <label className="block text-sm">
            <span className="capitalize font-medium text-gray-800">{platform}</span>
            <select
                className="mt-1 w-full border border-gray-300 rounded-lg p-2"
                value={value}
                onChange={(e) => onChange(e.target.value as TrackingMode)}
            >
                {options.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
        </label>
    );
}
