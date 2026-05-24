import { useEffect, useState } from 'react';
import { Award, Lock } from 'lucide-react';
import { StorageService } from '../storage';
import { BadgeId } from '../types';

const BADGE_META: Record<BadgeId, { name: string; description: string }> = {
    'under_limit': { name: 'Self Control', description: 'Stayed under daily limit' },
    'focus_master': { name: 'Focus Master', description: '3 day streak' },
    'weekend_warrior': { name: 'Weekend Warrior', description: 'No usage on weekend' }
};

export const Badges = () => {
    const [earned, setEarned] = useState<string[]>([]);

    useEffect(() => {
        StorageService.getBadges().then(setEarned);
    }, []);

    const allBadges: BadgeId[] = ['under_limit', 'focus_master', 'weekend_warrior'];

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Award size={16} className="text-purple-600" />
                Achievements
            </h3>

            <div className="grid grid-cols-1 gap-3">
                {allBadges.map(id => {
                    const isUnlocked = earned.includes(id);
                    const meta = BADGE_META[id];

                    return (
                        <div key={id} className={`p-3 rounded-lg border flex items-center gap-3 ${isUnlocked ? 'bg-purple-50 border-purple-100' : 'bg-gray-50 border-gray-100 opacity-60'
                            }`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isUnlocked ? 'bg-purple-100 text-purple-600' : 'bg-gray-200 text-gray-400'
                                }`}>
                                {isUnlocked ? <Award size={20} /> : <Lock size={20} />}
                            </div>
                            <div>
                                <div className={`font-bold text-sm ${isUnlocked ? 'text-gray-900' : 'text-gray-500'}`}>
                                    {meta.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {meta.description}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
