import { Platform } from '../types';

let toastHost: HTMLDivElement | null = null;

function ensureToastHost(): HTMLDivElement {
    if (toastHost?.isConnected) return toastHost;

    toastHost = document.createElement('div');
    toastHost.id = 'focus-overlay-toast-host';
    document.body.appendChild(toastHost);
    return toastHost;
}

export function showWarningToast(platform: Platform, message: string) {
    const host = ensureToastHost();
    const el = document.createElement('div');
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
            'box-shadow:0 4px 24px rgba(0,0,0,0.35)',
            'max-width:90vw',
            'text-align:center',
        ].join(';')
    );
    el.textContent = `${platform}: ${message}`;
    host.appendChild(el);

    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transition = 'opacity 0.3s';
        setTimeout(() => el.remove(), 300);
    }, 5000);
}
