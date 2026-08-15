import { Platform } from '../types';
import { redirectToBlockPage } from '../utils/blockPage';
import { showWarningToast } from '../components/toastHost';

const warned = { daily: false, session: false };

/**
 * Starts the limit-guard listener for the given platform.
 * Returns a cleanup function that stops the listener.
 */
export function startLimitGuard(platform: Platform): () => void {
    const messageListener = (message: any) => {
        if (message.type === 'BLOCK_TAB' && message.payload?.platform === platform) {
            void redirectToBlockPage(platform, message.payload.reason, message.payload.until);
        } else if (message.type === 'WARN_TAB') {
            const { warnDaily, warnSession, state } = message.payload;
            if (warnDaily && !warned.daily) {
                warned.daily = true;
                const remaining = state.effectiveDailyLimit - state.dailyUsage;
                showWarningToast(
                    platform,
                    `~${Math.ceil(remaining / 60)} min left on today's limit`
                );
            }
            if (warnSession && !warned.session) {
                warned.session = true;
                const remaining = state.effectiveSessionLimit - state.sessionSeconds;
                showWarningToast(platform, `~${Math.ceil(remaining / 60)} min left this session`);
            }
        }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
        chrome.runtime.onMessage.removeListener(messageListener);
    };
}
