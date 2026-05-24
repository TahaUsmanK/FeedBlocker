import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import { LayoutDashboard, Settings as SettingsIcon, Award } from 'lucide-react';
import { Dashboard } from './Dashboard';
import { Settings } from './Settings';
import { Badges } from './Badges';
import '../index.css'

const Popup = () => {
    const [tab, setTab] = useState<'dashboard' | 'settings' | 'badges'>('dashboard');

    return (
        <div className="w-80 bg-white min-h-[400px] flex flex-col font-sans text-gray-900">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-center">
                <h1 className="text-lg font-bold tracking-tight text-gray-900">FocusOverlay</h1>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 overflow-y-auto">
                {tab === 'dashboard' && <Dashboard />}
                {tab === 'settings' && <Settings />}
                {tab === 'badges' && <Badges />}
            </div>

            {/* Tab Bar */}
            <div className="grid grid-cols-3 border-t border-gray-100 bg-gray-50">
                <button
                    onClick={() => setTab('dashboard')}
                    className={`flex flex-col items-center justify-center gap-1 p-3 transition-colors ${tab === 'dashboard' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-600'
                        }`}
                >
                    <LayoutDashboard size={20} />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Dashboard</span>
                </button>
                <button
                    onClick={() => setTab('badges')}
                    className={`flex flex-col items-center justify-center gap-1 p-3 transition-colors ${tab === 'badges' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-600'
                        }`}
                >
                    <Award size={20} />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Awards</span>
                </button>
                <button
                    onClick={() => setTab('settings')}
                    className={`flex flex-col items-center justify-center gap-1 p-3 transition-colors ${tab === 'settings' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-600'
                        }`}
                >
                    <SettingsIcon size={20} />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Settings</span>
                </button>
            </div>
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <Popup />
    </React.StrictMode>,
)
