import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { StorageService } from '../storage';
import { AppSettings, Platform } from '../types';

export const Settings = () => {
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        StorageService.getSettings().then(setSettings);
    }, []);

    const handleLimitChange = (platform: Platform, minutes: number) => {
        if (!settings) return;
        setSettings({
            ...settings,
            limits: {
                ...settings.limits,
                [platform]: minutes * 60 // Store as seconds
            }
        });
    };

    const save = async () => {
        if (!settings) return;
        await StorageService.saveSettings(settings);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    };

    if (!settings) return <div>Loading...</div>;

    const platforms: Platform[] = ['youtube', 'instagram', 'twitter', 'tiktok'];

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900">Daily Limits</h3>
                <div className="space-y-3">
                    {platforms.map(p => (
                        <div key={p} className="flex items-center justify-between">
                            <label className="capitalize text-gray-700 font-medium">{p}</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="0"
                                    className="w-20 p-2 border border-gray-300 rounded-lg text-right font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={Math.floor(settings.limits[p] / 60)}
                                    onChange={(e) => handleLimitChange(p, parseInt(e.target.value) || 0)}
                                />
                                <span className="text-sm text-gray-500">min</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <button
                onClick={save}
                className={`w-full py-3 rounded-lg font-bold text-white transition-all flex items-center justify-center gap-2 ${isSaved ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-900 hover:bg-gray-800'
                    }`}
            >
                <Save size={18} />
                {isSaved ? 'Saved!' : 'Save Changes'}
            </button>
        </div>
    );
};
