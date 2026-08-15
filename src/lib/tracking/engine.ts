import {
    PLATFORM_BY_ID,
    shouldTrackByMode,
    type ClassifiedContent,
    type PlatformDefinition,
} from '../platforms/registry';
import { StorageService } from '../../storage';
import { Platform, TrackingMode, VideoType } from '../../types';
import { updateOverlayHost } from './overlayHost';
import { ActivityTracker } from './activity';
import { hasPlayingVideo, hasVisiblePlayingVideo, startMediaObserver, stopMediaObserver, hasVideoElement, pruneMediaState } from './media';
import { SessionTracker } from './session';
import { watchSpaNavigation } from './spa';

function isExtensionInvalidated(error: unknown): boolean {
    return error instanceof Error && error.message.includes('Extension context invalidated');
}

export class TrackingEngine {
    private readonly platform: Platform;
    private readonly definition: PlatformDefinition;
    private readonly activity = new ActivityTracker();
    private readonly session = new SessionTracker();
    private trackingMode: TrackingMode;
    private lastContentId = '';
    private tickTimer: number | null = null;
    private unwatchNav: (() => void) | null = null;
    private storageListener: ((changes: Record<string, chrome.storage.StorageChange>, area: string) => void) | null = null;

    constructor(platform: Platform) {
        this.platform = platform;
        this.definition = PLATFORM_BY_ID[platform];
        this.trackingMode = this.definition.defaultMode;
    }

    async start(): Promise<void> {
        const settings = await StorageService.getSettings();
        this.trackingMode = settings.trackingMode[this.platform] ?? this.definition.defaultMode;

        this.storageListener = (changes, area) => {
            if (area === 'local' && changes.settings) {
                StorageService.getSettings().then((s) => {
                    this.trackingMode = s.trackingMode[this.platform] ?? this.definition.defaultMode;
                });
            }
        };
        chrome.storage.onChanged.addListener(this.storageListener);

        this.unwatchNav = watchSpaNavigation(() => {
            this.lastContentId = '';
            pruneMediaState();
        });

        startMediaObserver();

        this.tick();
        this.tickTimer = window.setInterval(() => this.tick(), 1000);
    }

    stop(): void {
        if (this.tickTimer !== null) clearInterval(this.tickTimer);
        this.unwatchNav?.();
        stopMediaObserver();
        this.activity.destroy();
        if (this.storageListener) {
            chrome.storage.onChanged.removeListener(this.storageListener);
            this.storageListener = null;
        }
    }

    private getContext() {
        return {
            pathname: location.pathname,
            href: location.href,
            hostname: location.hostname,
        };
    }

    private classify(): ClassifiedContent {
        return this.definition.classify(this.getContext());
    }

    private computeIsActive(mode: TrackingMode, trackable: boolean): boolean {
        if (!trackable) return false;

        const engaged = this.activity.isEngaged();
        const visible = this.activity.isPageVisible();
        const mediaVisible = hasVisiblePlayingVideo();
        const mediaPlaying = hasPlayingVideo();

        switch (mode) {
            case 'video_only':
                return visible && mediaVisible;
            case 'shorts_only':
            case 'reels_only':
                return engaged || mediaVisible;
            case 'all':
            default:
                if (this.definition.backgroundPlayback) {
                    // Critical fix: If there IS a video on the page, and it's paused, 
                    // DO NOT count as active even if the user is engaged with comments etc.
                    // If no video exists (e.g. homepage), just use engagement.
                    if (hasVideoElement()) {
                        return mediaPlaying;
                    }
                    return engaged;
                }
                return engaged;
        }
    }

    private tick(): void {
        const content = this.classify();
        const trackable = shouldTrackByMode(
            this.trackingMode,
            content,
            location.pathname
        );
        const isActive = this.computeIsActive(this.trackingMode, trackable);
        const sessionSeconds = this.session.tick(
            isActive,
            this.activity.msSinceActivity()
        );

        updateOverlayHost(isActive, sessionSeconds);

        this.maybeRecordView(content, trackable);

        if (!trackable || !isActive) return;

        try {
            chrome.runtime.sendMessage({
                type: 'HEARTBEAT',
                payload: {
                    platform: this.platform,
                    videoType: content.videoType,
                    isActive: true,
                    sessionSeconds,
                },
            });
        } catch (e) {
            if (isExtensionInvalidated(e)) this.stop();
        }
    }

    private maybeRecordView(content: ClassifiedContent, trackable: boolean): void {
        if (!trackable || !content.contentId || content.videoType === 'unknown') return;
        if (content.contentId === this.lastContentId) return;

        this.lastContentId = content.contentId;
        try {
            chrome.runtime.sendMessage({
                type: 'VIDEO_VIEW',
                payload: {
                    platform: this.platform,
                    videoType: content.videoType as VideoType,
                },
            });
        } catch (e) {
            if (isExtensionInvalidated(e)) this.stop();
        }
    }
}
