import { Platform, TrackingMode, VideoType } from '../../types';

export interface ContentContext {
    pathname: string;
    href: string;
    hostname: string;
}

export interface ClassifiedContent {
    videoType: VideoType;
    contentId: string;
    /** Page qualifies for tracking under restrictive modes */
    onTargetSurface: boolean;
}

export interface PlatformDefinition {
    id: Platform;
    label: string;
    hosts: string[];
    supportedModes: TrackingMode[];
    defaultMode: TrackingMode;
    /** Count time when video plays while tab visible but user idle (e.g. YouTube) */
    backgroundPlayback: boolean;
    classify: (ctx: ContentContext) => ClassifiedContent;
}

const pathIncludes = (pathname: string, ...parts: string[]) =>
    parts.some((p) => pathname.includes(p));

function classifyYouTube(ctx: ContentContext): ClassifiedContent {
    if (pathIncludes(ctx.pathname, '/shorts/')) {
        const id = ctx.pathname.split('/shorts/')[1]?.split('/')[0] || '';
        return { videoType: 'short', contentId: id, onTargetSurface: true };
    }
    if (pathIncludes(ctx.pathname, '/watch')) {
        const id = new URL(ctx.href).searchParams.get('v') || '';
        return { videoType: 'video', contentId: id, onTargetSurface: true };
    }
    return { videoType: 'unknown', contentId: '', onTargetSurface: false };
}

function classifyInstagram(ctx: ContentContext): ClassifiedContent {
    if (pathIncludes(ctx.pathname, '/reels/')) {
        const id = ctx.pathname.split('/reels/')[1]?.split('/')[0] || '';
        return { videoType: 'short', contentId: id, onTargetSurface: true };
    }
    if (pathIncludes(ctx.pathname, '/stories/')) {
        return { videoType: 'short', contentId: ctx.pathname, onTargetSurface: true };
    }
    return { videoType: 'video', contentId: ctx.pathname, onTargetSurface: true };
}

function classifyTikTok(ctx: ContentContext): ClassifiedContent {
    const match = ctx.pathname.match(/\/video\/(\d+)/);
    const id = match?.[1] || ctx.pathname;
    return { videoType: 'short', contentId: id, onTargetSurface: true };
}

function classifyFacebook(ctx: ContentContext): ClassifiedContent {
    if (pathIncludes(ctx.pathname, '/reel/')) {
        const id = ctx.pathname.split('/reel/')[1]?.split('/')[0] || '';
        return { videoType: 'short', contentId: id, onTargetSurface: true };
    }
    if (pathIncludes(ctx.pathname, '/watch', '/videos/')) {
        return { videoType: 'video', contentId: ctx.pathname, onTargetSurface: true };
    }
    return { videoType: 'video', contentId: '', onTargetSurface: true };
}

function classifyReddit(ctx: ContentContext): ClassifiedContent {
    if (
        pathIncludes(ctx.pathname, '/comments/', '/video/', '/r/') &&
        !pathIncludes(ctx.pathname, '/submit')
    ) {
        return { videoType: 'video', contentId: ctx.pathname, onTargetSurface: true };
    }
    return { videoType: 'unknown', contentId: '', onTargetSurface: true };
}

function classifyGenericFeed(ctx: ContentContext): ClassifiedContent {
    return { videoType: 'unknown', contentId: ctx.pathname, onTargetSurface: true };
}

export const PLATFORM_REGISTRY: PlatformDefinition[] = [
    {
        id: 'youtube',
        label: 'YouTube',
        hosts: ['youtube.com', 'youtu.be'],
        supportedModes: ['all', 'shorts_only', 'video_only'],
        defaultMode: 'all',
        backgroundPlayback: true,
        classify: classifyYouTube,
    },
    {
        id: 'instagram',
        label: 'Instagram',
        hosts: ['instagram.com'],
        supportedModes: ['all', 'reels_only', 'video_only'],
        defaultMode: 'all',
        backgroundPlayback: false,
        classify: classifyInstagram,
    },
    {
        id: 'twitter',
        label: 'X (Twitter)',
        hosts: ['twitter.com', 'x.com'],
        supportedModes: ['all', 'video_only'],
        defaultMode: 'all',
        backgroundPlayback: false,
        classify: classifyGenericFeed,
    },
    {
        id: 'tiktok',
        label: 'TikTok',
        hosts: ['tiktok.com'],
        supportedModes: ['all', 'video_only'],
        defaultMode: 'all',
        backgroundPlayback: false,
        classify: classifyTikTok,
    },
    {
        id: 'facebook',
        label: 'Facebook',
        hosts: ['facebook.com', 'fb.com', 'm.facebook.com', 'web.facebook.com'],
        supportedModes: ['all', 'reels_only', 'video_only'],
        defaultMode: 'all',
        backgroundPlayback: false,
        classify: classifyFacebook,
    },
    {
        id: 'reddit',
        label: 'Reddit',
        hosts: ['reddit.com', 'old.reddit.com', 'sh.reddit.com'],
        supportedModes: ['all', 'video_only'],
        defaultMode: 'all',
        backgroundPlayback: false,
        classify: classifyReddit,
    },
    {
        id: 'linkedin',
        label: 'LinkedIn',
        hosts: ['linkedin.com'],
        supportedModes: ['all', 'video_only'],
        defaultMode: 'all',
        backgroundPlayback: false,
        classify: classifyGenericFeed,
    },
    {
        id: 'twitch',
        label: 'Twitch',
        hosts: ['twitch.tv'],
        supportedModes: ['all', 'video_only'],
        defaultMode: 'video_only',
        backgroundPlayback: true,
        classify: (ctx) => ({
            videoType: 'video',
            contentId: ctx.pathname,
            onTargetSurface: true,
        }),
    },
    {
        id: 'pinterest',
        label: 'Pinterest',
        hosts: ['pinterest.com', 'pin.it'],
        supportedModes: ['all', 'video_only'],
        defaultMode: 'all',
        backgroundPlayback: false,
        classify: (ctx) => ({
            videoType: pathIncludes(ctx.pathname, '/pin/') ? 'short' : 'unknown',
            contentId: ctx.pathname,
            onTargetSurface: true,
        }),
    },
];

export const PLATFORM_BY_ID = Object.fromEntries(
    PLATFORM_REGISTRY.map((p) => [p.id, p])
) as Record<Platform, PlatformDefinition>;

export function detectPlatform(hostname: string): Platform | null {
    const host = hostname.toLowerCase();
    for (const def of PLATFORM_REGISTRY) {
        if (def.hosts.some((h) => host === h || host.endsWith(`.${h}`) || host.includes(h))) {
            return def.id;
        }
    }
    return null;
}

export function hostToPlatform(hostname: string): Platform | null {
    return detectPlatform(hostname);
}

export const ALL_TRACKED_HOSTS = PLATFORM_REGISTRY.flatMap((p) => p.hosts);

export const TRACKING_MODE_LABELS: Record<TrackingMode, string> = {
    all: 'Entire site (when active)',
    shorts_only: 'Short-form only (Shorts)',
    reels_only: 'Reels / short clips only',
    video_only: 'Only while video is playing',
};

export function shouldTrackByMode(
    mode: TrackingMode,
    content: ClassifiedContent,
    pathname: string
): boolean {
    switch (mode) {
        case 'all':
            return content.onTargetSurface;
        case 'shorts_only':
            return content.videoType === 'short' && content.onTargetSurface;
        case 'reels_only':
            return (
                (content.videoType === 'short' || pathIncludes(pathname, '/reel/')) &&
                content.onTargetSurface
            );
        case 'video_only':
            return content.onTargetSurface;
        default:
            return false;
    }
}

export function getModeOptionsForPlatform(platform: Platform): { value: TrackingMode; label: string }[] {
    const def = PLATFORM_BY_ID[platform];
    return def.supportedModes.map((mode) => ({
        value: mode,
        label: TRACKING_MODE_LABELS[mode],
    }));
}
