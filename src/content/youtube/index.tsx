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

const platform: Platform = 'youtube';
const activity = createActivityTracker();
const session = createSessionTracker();

let currentVideoId = '';
let trackingMode: TrackingMode = 'all';

const refreshTrackingMode = () => {
    StorageService.getSettings().then((s) => {
        trackingMode = s.trackingMode.youtube;
    });
};
refreshTrackingMode();

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings) refreshTrackingMode();
});

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
};

const isVideoPlaying = () => {
    const videos = document.getElementsByTagName('video');
    for (let i = 0; i < videos.length; i++) {
        const v = videos[i];
        if (!v.paused && !v.ended && v.currentTime > 0) return true;
    }
    return false;
};

const tick = async () => {
    const pathname = window.location.pathname;
    const videoType = getVideoType();
    const trackable = shouldTrackContent(platform, trackingMode, videoType, pathname);

    const isIdle = activity.isIdle();
    const isVisible = document.visibilityState === 'visible';
    const isActive =
        trackable && ((!isIdle && isVisible) || (trackingMode === 'all' && isVideoPlaying()));
    const sessionSeconds = session.tick(isActive, activity.msSinceActivity());

    updateOverlayHost(isActive, sessionSeconds);

    const videoId = getVideoId();
    if (
        trackable &&
        videoId &&
        videoId !== currentVideoId &&
        videoType !== 'unknown'
    ) {
        currentVideoId = videoId;
        try {
            chrome.runtime.sendMessage({
                type: 'VIDEO_VIEW',
                payload: { platform, videoType },
            });
        } catch (e) {
            if (isExtensionInvalidated(e)) clearInterval(tickInterval);
            return;
        }
    }

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

const tickInterval = setInterval(() => {
    void tick();
}, 1000);

if (document.body) {
    mountPlatformOverlay(platform);
    startLimitGuard(platform);
} else {
    window.addEventListener('DOMContentLoaded', () => {
        mountPlatformOverlay(platform);
        startLimitGuard(platform);
    });
}
