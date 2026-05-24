import React from 'react';
import { createRoot } from 'react-dom/client';
import { Overlay } from '../../components/Overlay';
import { Platform, VideoType } from '../../types';
import css from '../../index.css?inline';

// --- Tracker Logic ---
let lastActiveTime = Date.now();
const IDLE_THRESHOLD = 30000; // 30s

const updateActivity = () => {
    lastActiveTime = Date.now();
};

['mousemove', 'keydown', 'scroll', 'click'].forEach(event => {
    window.addEventListener(event, updateActivity, { passive: true });
});

const getVideoType = (): VideoType => {
    const path = window.location.pathname;
    if (path.includes('/reels/')) return 'short'; // Instagram Reels treated as Shorts
    return 'unknown';
};

const tick = () => {
    const now = Date.now();
    const isIdle = (now - lastActiveTime) > IDLE_THRESHOLD;
    const isVisible = document.visibilityState === 'visible';
    const isActive = !isIdle && isVisible;
    const videoType = getVideoType();

    // On Instagram we might want to track everything, but PDD says "Reels vs feed"
    // For MVP Phase 2, we can track everything as 'video' or 'unknown' if not reels?
    // Let's stick to tracking ONLY Reels for now if we want to be strict,
    // OR track everything but categorize.
    // Let's track everything so the timer works, but mark type accurately.
    // Actually, PDD 4.3 says "Reels vs feed vs stories". 
    // For simplicity let's treat non-reels as 'video' (feed) to ensure tracking works.

    // However, to keep it consistent with YouTube MVP logic (which only tracks video/shorts),
    // let's send heartbeat for everything on IG, but distinguish types.

    if (videoType === 'short') { // Only tracking Reels specifically as 'short'
        try {
            chrome.runtime.sendMessage({
                type: 'HEARTBEAT',
                payload: {
                    platform: 'instagram' as Platform,
                    videoType,
                    isActive
                }
            });
        } catch (e) {
            clearInterval(tickInterval);
            return;
        }
    } else {
        // Generic tracking for feed
        try {
            chrome.runtime.sendMessage({
                type: 'HEARTBEAT',
                payload: {
                    platform: 'instagram' as Platform,
                    videoType: 'video', // Treat feed as long-form/generic
                    isActive
                }
            });
        } catch (e) {
            clearInterval(tickInterval);
            return;
        }
    }
};

const tickInterval = setInterval(tick, 1000);
console.log('FocusOverlay: Instagram Tracker Active');

// --- UI Injection ---
const mountOverlay = () => {
    if (document.getElementById('focus-overlay-host')) return;

    const host = document.createElement('div');
    host.id = 'focus-overlay-host';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = css;
    shadow.appendChild(style);

    const root = document.createElement('div');
    shadow.appendChild(root);

    createRoot(root).render(
        <React.StrictMode>
            <Overlay platform="instagram" />
        </React.StrictMode>
    );
};

if (document.body) {
    mountOverlay();
} else {
    window.addEventListener('DOMContentLoaded', mountOverlay);
}
