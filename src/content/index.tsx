import { detectPlatform } from '../lib/platforms/registry';
import { TrackingEngine } from '../lib/tracking/engine';
import { mountPlatformOverlay } from './shared';
import { startLimitGuard } from './limitGuard';

const platform = detectPlatform(location.hostname);

if (platform) {
    const engine = new TrackingEngine(platform);
    let cleanupGuard: (() => void) | null = null;

    const boot = () => {
        mountPlatformOverlay(platform);
        cleanupGuard = startLimitGuard(platform);
        void engine.start();
    };

    /**
     * Tear down all intervals and listeners on extension context invalidation.
     * Prevents BUG-11: leaked limitGuard intervals causing duplicate HEARTBEATs.
     */
    const teardown = () => {
        engine.stop();
        cleanupGuard?.();
        cleanupGuard = null;
    };

    // Listen for context invalidation (extension reload/update)
    chrome.runtime.connect().onDisconnect.addListener(teardown);

    if (document.body) {
        boot();
    } else {
        window.addEventListener('DOMContentLoaded', boot, { once: true });
    }
}
