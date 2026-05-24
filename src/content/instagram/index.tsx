import { Platform, TrackingMode, VideoType } from '../../types';
import { shouldTrackContent } from '../../lib/limits';
import { StorageService } from '../../storage';
import {
    createActivityTracker,
    createSessionTracker,
    isExtensionInvalidated,
    mountPlatformOverlay,
    updateOverlayHost,
} from '../shared';
import { startLimitGuard } from '../limitGuard';

const platform: Platform = 'instagram';
const activity = createActivityTracker();
const session = createSessionTracker();

let trackingMode: TrackingMode = 'all';

const refreshTrackingMode = () => {
    StorageService.getSettings().then((s) => {
        trackingMode = s.trackingMode.instagram;
    });
};
refreshTrackingMode();

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings) refreshTrackingMode();
});

const getVideoType = (): VideoType => {
    if (window.location.pathname.includes('/reels/')) return 'short';
    return 'video';
};

const tick = () => {
    const pathname = window.location.pathname;
    const videoType = getVideoType();
    const trackable = shouldTrackContent(platform, trackingMode, videoType, pathname);

    const isActive =
        trackable && !activity.isIdle() && document.visibilityState === 'visible';
    const sessionSeconds = session.tick(isActive, activity.msSinceActivity());

    updateOverlayHost(isActive, sessionSeconds);

    if (!trackable || !isActive) return;

    try {
        chrome.runtime.sendMessage({
            type: 'HEARTBEAT',
            payload: { platform, videoType, isActive: true },
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
