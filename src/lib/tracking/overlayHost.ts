export function updateOverlayHost(isActive: boolean, sessionSeconds: number) {
    const host = document.getElementById('focus-overlay-host');
    if (!host) return;
    host.dataset.isActive = isActive ? 'true' : 'false';
    host.dataset.sessionSeconds = String(sessionSeconds);
}
