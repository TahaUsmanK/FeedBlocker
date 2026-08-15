import { Platform } from '../types';

/** Max concurrent toasts shown at once */
const MAX_TOASTS = 2;

let toastHost: HTMLDivElement | null = null;
let activeToasts: HTMLDivElement[] = [];

function ensureToastHost(): HTMLDivElement {
    if (toastHost?.isConnected) return toastHost;

    toastHost = document.createElement('div');
    toastHost.id = 'focus-overlay-toast-host';
    // aria-live so screen readers announce warnings
    toastHost.setAttribute('aria-live', 'assertive');
    toastHost.setAttribute('aria-atomic', 'false');
    toastHost.setAttribute('role', 'status');
    document.body.appendChild(toastHost);
    return toastHost;
}

export function showWarningToast(platform: Platform, message: string) {
    const host = ensureToastHost();

    // Deduplicate: don't show the same message if it's already visible
    const existing = activeToasts.find((t) => t.dataset.message === message);
    if (existing) return;

    // Cap: remove oldest toast if over limit
    if (activeToasts.length >= MAX_TOASTS) {
        activeToasts[0]?.remove();
        activeToasts.shift();
    }

    const el = document.createElement('div');
    el.dataset.message = message;
    el.setAttribute(
        'style',
        [
            'position:fixed',
            'bottom:24px',
            'left:50%',
            'transform:translateX(-50%)',
            'z-index:2147483646',
            'background:#1e293b',
            'color:#f8fafc',
            'padding:12px 20px',
            'border-radius:8px',
            'font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
            'font-size:14px',
            'line-height:1.4',
            'box-shadow:0 4px 24px rgba(0,0,0,0.35)',
            'max-width:90vw',
            'text-align:center',
            'transition:opacity 0.3s',
        ].join(';')
    );
    el.textContent = `${platform}: ${message}`;
    host.appendChild(el);
    activeToasts.push(el);

    setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => {
            el.remove();
            activeToasts = activeToasts.filter((t) => t !== el);
        }, 300);
    }, 5000);
}
