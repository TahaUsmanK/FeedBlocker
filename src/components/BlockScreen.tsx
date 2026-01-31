import { Lock } from 'lucide-react';
import { Platform } from '../types';

interface BlockScreenProps {
    platform: Platform;
    onOverride: () => void;
}

export const BlockScreen = ({ platform, onOverride }: BlockScreenProps) => {
    return (
        <div className="fixed inset-0 z-[10000] bg-gray-900/95 backdrop-blur-md flex flex-col items-center justify-center text-white p-8 animate-in fade-in duration-300">
            <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-md w-full border border-gray-700">
                <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mb-6 text-red-500">
                    <Lock size={32} />
                </div>

                <h1 className="text-3xl font-bold mb-2 text-center">Time's Up!</h1>
                <p className="text-gray-400 text-center mb-8">
                    You've reached your daily limit for <span className="capitalize text-white font-semibold">{platform}</span>.
                </p>

                <div className="flex flex-col w-full gap-3">
                    <button
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
                        onClick={onOverride}
                    >
                        Ignore for 5 Minutes
                    </button>
                    <button
                        className="w-full py-3 bg-transparent border border-gray-600 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
                    >
                        Close Tab
                    </button>
                </div>
            </div>
        </div>
    );
};
