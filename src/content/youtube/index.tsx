import React from 'react';
import { createRoot } from 'react-dom/client';
import { Overlay } from '../../components/Overlay';
import { Platform, VideoType } from '../../types';
import css from '../../index.css?inline';

// --- Tracker Logic ---
let lastActiveTime = Date.now();
const IDLE_THRESHOLD = 30000; // 30 seconds
let currentVideoId = '';

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

const getVideoId = (): string => {
    const url = new URL(window.location.href);
    if (url.pathname.includes('/shorts/')) {
        return url.pathname.split('/shorts/')[1];
    }
    if (url.pathname.includes('/watch')) {
        return url.searchParams.get('v') || '';
    }
    return '';
}

const tick = () => {
    const now = Date.now();
    const isIdle = (now - lastActiveTime) > IDLE_THRESHOLD;
    const isVisible = document.visibilityState === 'visible';

    // Check if any video is playing
    const videos = document.getElementsByTagName('video');
    let isVideoPlaying = false;
    for (let i = 0; i < videos.length; i++) {
        if (!videos[i].paused && !videos[i].ended && videos[i].currentTime > 0) {
            isVideoPlaying = true;
            break;
        }
    }

    // Active if:
    // 1. Not idle AND Visible (Browsing/Scrolling)
    // 2. OR Video is playing (Watching/Listening in background)
    const isActive = (!isIdle && isVisible) || isVideoPlaying;

    const videoType = getVideoType();
    const videoId = getVideoId();

    // Track Video Views
    if (videoId && videoId !== currentVideoId && videoType !== 'unknown') {
        currentVideoId = videoId;
        try {
            chrome.runtime.sendMessage({
                type: 'VIDEO_VIEW',
                payload: {
                    platform: 'youtube' as Platform,
                    videoType
                }
            });
        } catch (e) {
            console.log('FocusOverlay: Extension context invalidated. Stopping tracker.');
            clearInterval(tickInterval);
            return;
        }
    }

    if (videoType !== 'unknown') {
        try {
            chrome.runtime.sendMessage({
                type: 'HEARTBEAT',
                payload: {
                    platform: 'youtube' as Platform,
                    videoType,
                    isActive
                }
            });

            // Optimistic UI Update for Overlay
            const overlayHost = document.getElementById('focus-overlay-host');
            if (overlayHost) {
                overlayHost.dataset.isActive = isActive ? 'true' : 'false';
            }
        } catch (e) {
            console.log('FocusOverlay: Extension context invalidated. Stopping tracker.');
            clearInterval(tickInterval);
            return;
        }
    }
};

const tickInterval = setInterval(tick, 1000);
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
