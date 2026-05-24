import { detectPlatform } from '../lib/platforms/registry';
import { TrackingEngine } from '../lib/tracking/engine';
import { mountPlatformOverlay } from './shared';
import { startLimitGuard } from './limitGuard';

const platform = detectPlatform(location.hostname);

if (platform) {
    const engine = new TrackingEngine(platform);

    const boot = () => {
        mountPlatformOverlay(platform);
        startLimitGuard(platform);
        void engine.start();
    };

    if (document.body) {
        boot();
    } else {
        window.addEventListener('DOMContentLoaded', boot, { once: true });
    }
}
