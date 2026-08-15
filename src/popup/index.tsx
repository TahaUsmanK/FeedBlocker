import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Dashboard } from './Dashboard';
import '../index.css';

import { Logo } from '../components/Logo';

const Popup = () => {
    const openOptions = () => chrome.runtime.openOptionsPage();

    return (
        <div className="popup-root">
            <header className="popup-header">
                <div className="popup-logo">
                    <Logo size={20} className="popup-logo-mark" />
                    <span className="popup-logo-name">FeedBlocker</span>
                </div>
                <button
                    type="button"
                    className="popup-settings-btn"
                    onClick={openOptions}
                    aria-label="Open settings"
                >
                    Settings
                </button>
            </header>

            <div className="popup-body">
                <ErrorBoundary fallbackTitle="Failed to load usage">
                    <Dashboard />
                </ErrorBoundary>
            </div>
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <Popup />
    </React.StrictMode>
);
