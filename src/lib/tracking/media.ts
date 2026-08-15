/**
 * Event-driven media play-state tracking.
 *
 * Instead of polling querySelectorAll('video') every second, we attach
 * play/pause/ended listeners to video elements as they appear in the DOM.
 * This gives us a cached boolean that the engine tick can read for free,
 * with zero DOM work per tick.
 *
 * A MutationObserver watches for new <video> elements added by SPAs.
 */

const MIN_VISIBLE_RATIO = 0.2;

/** Cached play states per video element (WeakMap — GC-friendly) */
const playingVideos = new Set<HTMLVideoElement>();

function onPlay(e: Event) {
    const video = e.currentTarget as HTMLVideoElement;
    if (isVideoActivelyPlaying(video)) {
        playingVideos.add(video);
    }
}
function onPause(e: Event) {
    playingVideos.delete(e.currentTarget as HTMLVideoElement);
}
function onEnded(e: Event) {
    playingVideos.delete(e.currentTarget as HTMLVideoElement);
}

const attachedVideos = new WeakSet<HTMLVideoElement>();

function isVideoActivelyPlaying(video: HTMLVideoElement): boolean {
    if (!video.isConnected) {
        playingVideos.delete(video);
        return false;
    }
    if (video.paused || video.ended || video.readyState < 2) {
        playingVideos.delete(video);
        return false;
    }
    return true;
}

function attachToVideo(video: HTMLVideoElement) {
    if (attachedVideos.has(video)) return;
    attachedVideos.add(video);

    video.addEventListener('play', onPlay, { passive: true });
    video.addEventListener('playing', onPlay, { passive: true });
    video.addEventListener('pause', onPause, { passive: true });
    video.addEventListener('ended', onEnded, { passive: true });
    video.addEventListener('emptied', onPause, { passive: true });
    video.addEventListener('abort', onPause, { passive: true });
    video.addEventListener('error', onPause, { passive: true });

    // Sync current state — video may already be playing when we attach
    if (isVideoActivelyPlaying(video) && video.currentTime > 0) {
        playingVideos.add(video);
    }
}

function scanVideos() {
    document.querySelectorAll<HTMLVideoElement>('video').forEach(attachToVideo);
}

/** Watch for dynamically-injected <video> elements (SPAs) */
const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
        for (const node of m.addedNodes) {
            if (node instanceof HTMLVideoElement) {
                attachToVideo(node);
            } else if (node instanceof Element) {
                node.querySelectorAll<HTMLVideoElement>('video').forEach(attachToVideo);
            }
        }
        // Clean up removed videos directly or within removed subtrees
        for (const node of m.removedNodes) {
            if (node instanceof HTMLVideoElement) {
                playingVideos.delete(node);
            } else if (node instanceof Element) {
                node.querySelectorAll<HTMLVideoElement>('video').forEach((v) => playingVideos.delete(v));
            }
        }
    }
});

export function startMediaObserver() {
    scanVideos();
    observer.observe(document.documentElement, { childList: true, subtree: true });
}

export function stopMediaObserver() {
    observer.disconnect();
    playingVideos.clear();
}

export function pruneMediaState(): void {
    for (const video of Array.from(playingVideos)) {
        isVideoActivelyPlaying(video);
    }
}

function isElementVisible(el: HTMLVideoElement): boolean {
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;

    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;

    const visW = Math.min(rect.right, vw) - Math.max(rect.left, 0);
    const visH = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
    if (visW <= 0 || visH <= 0) return false;

    return (visW * visH) / (rect.width * rect.height) >= MIN_VISIBLE_RATIO;
}

/**
 * Is ANY tracked video currently playing and substantially visible?
 * Validates active playback state and prunes stale elements.
 */
export function hasVisiblePlayingVideo(): boolean {
    for (const video of Array.from(playingVideos)) {
        if (isVideoActivelyPlaying(video) && isElementVisible(video)) {
            return true;
        }
    }
    return false;
}

/**
 * Is ANY tracked video currently playing (even off-screen / background tab)?
 * Validates active playback state and prunes stale elements.
 */
export function hasPlayingVideo(): boolean {
    for (const video of Array.from(playingVideos)) {
        if (isVideoActivelyPlaying(video)) {
            return true;
        }
    }
    return false;
}

/**
 * Is there a connected <video> element on this page at all (playing or paused)?
 * Used to distinguish "no video on page" from "video is paused".
 */
export function hasVideoElement(): boolean {
    const video = document.querySelector('video');
    return video !== null && video.isConnected;
}
