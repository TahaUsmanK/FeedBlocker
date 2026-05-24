/** User considered idle after this without input */
export const IDLE_THRESHOLD_MS = 30_000;
const MOUSE_THROTTLE_MS = 800;
const SCROLL_THROTTLE_MS = 400;

export class ActivityTracker {
    private lastActiveTime = Date.now();
    private lastMouse = 0;
    private lastScroll = 0;

    constructor() {
        const bump = () => {
            this.lastActiveTime = Date.now();
        };

        const bumpMouse = () => {
            const now = Date.now();
            if (now - this.lastMouse < MOUSE_THROTTLE_MS) return;
            this.lastMouse = now;
            bump();
        };

        const bumpScroll = () => {
            const now = Date.now();
            if (now - this.lastScroll < SCROLL_THROTTLE_MS) return;
            this.lastScroll = now;
            bump();
        };

        const events: [string, EventListener][] = [
            ['pointerdown', bump],
            ['pointerup', bump],
            ['keydown', bump],
            ['touchstart', bump],
            ['wheel', bumpScroll],
            ['scroll', bumpScroll],
            ['mousemove', bumpMouse],
            ['visibilitychange', bump],
            ['focus', bump],
            ['blur', bump],
        ];

        for (const [name, handler] of events) {
            window.addEventListener(name, handler, { passive: true, capture: true });
        }
    }

    msSinceActivity(): number {
        return Date.now() - this.lastActiveTime;
    }

    isIdle(): boolean {
        return this.msSinceActivity() > IDLE_THRESHOLD_MS;
    }

    isPageVisible(): boolean {
        return document.visibilityState === 'visible';
    }

    /** Tab visible and user recently interacted */
    isEngaged(): boolean {
        return this.isPageVisible() && !this.isIdle();
    }
}
