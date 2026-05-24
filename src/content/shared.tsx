import React from 'react';
import { createRoot } from 'react-dom/client';
import { Overlay } from '../components/Overlay';
import { Platform } from '../types';
import css from '../index.css?inline';

export const IDLE_THRESHOLD_MS = 30_000;
export const SESSION_IDLE_RESET_MS = 5 * 60 * 1000;

export function createActivityTracker() {
    let lastActiveTime = Date.now();

    const updateActivity = () => {
        lastActiveTime = Date.now();
    };

    ['mousemove', 'keydown', 'scroll', 'click'].forEach((event) => {
        window.addEventListener(event, updateActivity, { passive: true });
    });

    return {
        isIdle: () => Date.now() - lastActiveTime > IDLE_THRESHOLD_MS,
        msSinceActivity: () => Date.now() - lastActiveTime,
    };
}

export function createSessionTracker() {
    let sessionSeconds = 0;

    return {
        tick(isActive: boolean, msSinceActivity: number) {
            if (isActive) {
                sessionSeconds += 1;
            } else if (msSinceActivity >= SESSION_IDLE_RESET_MS) {
                sessionSeconds = 0;
            }
            return sessionSeconds;
        },
    };
}

export function updateOverlayHost(isActive: boolean, sessionSeconds: number) {
    const host = document.getElementById('focus-overlay-host');
    if (!host) return;
    host.dataset.isActive = isActive ? 'true' : 'false';
    host.dataset.sessionSeconds = String(sessionSeconds);
}

export function mountPlatformOverlay(platform: Platform) {
    if (document.getElementById('focus-overlay-host')) return;

    const host = document.createElement('div');
    host.id = 'focus-overlay-host';
    host.dataset.isActive = 'false';
    host.dataset.sessionSeconds = '0';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = css;
    shadow.appendChild(style);

    const root = document.createElement('div');
    shadow.appendChild(root);

    createRoot(root).render(
        <React.StrictMode>
            <Overlay platform={platform} />
        </React.StrictMode>
    );
}

export function isExtensionInvalidated(error: unknown): boolean {
    return error instanceof Error && error.message.includes('Extension context invalidated');
}
