import React from 'react';
import { createRoot } from 'react-dom/client';
import { Overlay } from '../../components/Overlay';
import { Platform, VideoType } from '../../types';
import css from '../../index.css?inline';

// --- Tracker Logic ---
let lastActiveTime = Date.now();
const IDLE_THRESHOLD = 30000; // 30 seconds

const updateActivity = () => {
    lastActiveTime = Date.now();
};

window.addEventListener('mousemove', updateActivity, { passive: true });
window.addEventListener('keydown', updateActivity, { passive: true });
window.addEventListener('scroll', updateActivity, { passive: true });
window.addEventListener('click', updateActivity, { passive: true });

const getVideoType = (): VideoType => {
    const path = window.location.pathname;
    if (path.includes('/shorts/')) return 'short';
    if (path.includes('/watch')) return 'video';
    return 'unknown';
};

const tick = () => {
    const now = Date.now();
    const isIdle = (now - lastActiveTime) > IDLE_THRESHOLD;
    const isVisible = document.visibilityState === 'visible';
    const isActive = !isIdle && isVisible;
    const videoType = getVideoType();

    if (videoType !== 'unknown') {
        chrome.runtime.sendMessage({
            type: 'HEARTBEAT',
            payload: {
                platform: 'youtube' as Platform,
                videoType,
                isActive
            }
        });
    }
};

setInterval(tick, 1000);
console.log('FocusOverlay: YouTube Tracker Active');

// --- UI Injection ---
const mountOverlay = () => {
    // Avoid double injection
    if (document.getElementById('focus-overlay-host')) return;

    const host = document.createElement('div');
    host.id = 'focus-overlay-host';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });

    // Inject styles (Tailwind + Overlay)
    const style = document.createElement('style');
    style.textContent = css;
    shadow.appendChild(style);

    const root = document.createElement('div');
    shadow.appendChild(root);

    createRoot(root).render(
        <React.StrictMode>
        <Overlay />
        </React.StrictMode>
    );
};

// Check if ready, if not wait for body
if (document.body) {
    mountOverlay();
} else {
    window.addEventListener('DOMContentLoaded', mountOverlay);
}
