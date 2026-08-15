import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Dashboard } from './Dashboard';
import '../index.css';

// Minimal inline SVG logo mark (no external dependency)
const LogoMark = ({ size = 20 }: { size?: number }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="popup-logo-mark"
    >
        <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2.5" />
        <path d="M16 16 L16 3 A13 13 0 0 1 27.26 22.5 Z" fill="currentColor" opacity="0.85" />
        <circle cx="16" cy="16" r="2" fill="currentColor" />
    </svg>
);

const Popup = () => {
    const openOptions = () => chrome.runtime.openOptionsPage();

    return (
        <div className="popup-root">
            <header className="popup-header">
                <div className="popup-logo">
                    <LogoMark />
                    <span className="popup-logo-name">FocusOverlay</span>
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
