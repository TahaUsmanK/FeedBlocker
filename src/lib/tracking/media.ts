/** Minimum visible area ratio to count a playing video */
const MIN_VISIBLE_RATIO = 0.2;

function isElementVisible(el: Element): boolean {
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;

    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;

    const visibleW = Math.min(rect.right, vw) - Math.max(rect.left, 0);
    const visibleH = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
    if (visibleW <= 0 || visibleH <= 0) return false;

    const visibleArea = visibleW * visibleH;
    const totalArea = rect.width * rect.height;
    return totalArea > 0 && visibleArea / totalArea >= MIN_VISIBLE_RATIO;
}

function isVideoPlaying(video: HTMLVideoElement): boolean {
    return !video.paused && !video.ended && video.readyState >= 2 && video.currentTime > 0;
}

/** Any playing video substantially visible in the viewport */
export function hasVisiblePlayingVideo(): boolean {
    const videos = document.querySelectorAll('video');
    for (const node of videos) {
        const video = node as HTMLVideoElement;
        if (isVideoPlaying(video) && isElementVisible(video)) {
            return true;
        }
    }
    return false;
}

/** Playing video even if off-screen (background audio tab) */
export function hasPlayingVideo(): boolean {
    const videos = document.querySelectorAll('video');
    for (const node of videos) {
        if (isVideoPlaying(node as HTMLVideoElement)) return true;
    }
    return false;
}
