import React from 'react';
import ReactDOM from 'react-dom/client';
import { ExternalLink } from 'lucide-react';
import { Dashboard } from './Dashboard';
import '../index.css';

const Popup = () => {
    const openOptions = () => {
        chrome.runtime.openOptionsPage();
    };

    return (
        <div className="w-80 bg-white min-h-[320px] flex flex-col font-sans text-gray-900">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h1 className="text-lg font-bold">FocusOverlay</h1>
                <button
                    type="button"
                    onClick={openOptions}
                    className="text-xs text-blue-600 hover:text-blue-500 flex items-center gap-1 font-medium"
                >
                    Settings
                    <ExternalLink size={12} />
                </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
                <Dashboard />
            </div>

            <div className="p-3 border-t border-gray-100 bg-gray-50 text-center">
                <button
                    type="button"
                    onClick={openOptions}
                    className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                >
                    Open full settings &amp; export
                </button>
            </div>
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <Popup />
    </React.StrictMode>
);
