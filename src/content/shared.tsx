import React from 'react';
import { createRoot } from 'react-dom/client';
import { Overlay } from '../components/Overlay';
import { Platform } from '../types';
import { SESSION_IDLE_RESET_MS } from '../lib/tracking/session';
import css from '../index.css?inline';

export { SESSION_IDLE_RESET_MS };

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
