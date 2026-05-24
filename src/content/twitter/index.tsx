import { Platform } from '../../types';
import {
    createActivityTracker,
    createSessionTracker,
    isExtensionInvalidated,
    mountPlatformOverlay,
    updateOverlayHost,
} from '../shared';
import { startLimitGuard } from '../limitGuard';

const platform: Platform = 'twitter';
const activity = createActivityTracker();
const session = createSessionTracker();

const tick = () => {
    const isActive = !activity.isIdle() && document.visibilityState === 'visible';
    const sessionSeconds = session.tick(isActive, activity.msSinceActivity());

    updateOverlayHost(isActive, sessionSeconds);

    if (!isActive) return;

    try {
        chrome.runtime.sendMessage({
            type: 'HEARTBEAT',
            payload: { platform, videoType: 'unknown', isActive: true },
        });
    } catch (e) {
        if (isExtensionInvalidated(e)) clearInterval(tickInterval);
    }
};

const tickInterval = setInterval(tick, 1000);

if (document.body) {
    mountPlatformOverlay(platform);
    startLimitGuard(platform);
} else {
    window.addEventListener('DOMContentLoaded', () => {
        mountPlatformOverlay(platform);
        startLimitGuard(platform);
    });
}
