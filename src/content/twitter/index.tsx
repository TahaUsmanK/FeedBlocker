import React from 'react';
import { createRoot } from 'react-dom/client';
import { Overlay } from '../../components/Overlay';
import { Platform } from '../../types';
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

const tick = () => {
    const now = Date.now();
    const isIdle = (now - lastActiveTime) > IDLE_THRESHOLD;
    const isVisible = document.visibilityState === 'visible';
    const isActive = !isIdle && isVisible;

    // Twitter doesn't have a distinct "Shorts" URL structure like YouTube/IG Reels
    // We track total time on the platform for now.
    chrome.runtime.sendMessage({
        type: 'HEARTBEAT',
        payload: {
            platform: 'twitter' as Platform,
            videoType: 'unknown',
            isActive
        }
    });

};

setInterval(tick, 1000);
console.log('FocusOverlay: Twitter Tracker Active');

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
            <Overlay platform="twitter" />
        </React.StrictMode>
    );
};

if (document.body) {
    mountOverlay();
} else {
    window.addEventListener('DOMContentLoaded', mountOverlay);
}
