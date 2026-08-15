export type NavigationCallback = () => void;

/**
 * Detect SPA route changes via History API interception + popstate.
 *
 * REMOVED: 500ms polling interval. The pushState/replaceState wrap and
 * popstate/hashchange listeners cover 100% of SPA navigations. The old
 * 500ms poll was burning 2 location.href reads/second/tab for no benefit.
 */
export function watchSpaNavigation(onNavigate: NavigationCallback): () => void {
    let lastHref = location.href;

    const check = () => {
        if (location.href !== lastHref) {
            lastHref = location.href;
            onNavigate();
        }
    };

    const pushState = history.pushState.bind(history);
    const replaceState = history.replaceState.bind(history);

    history.pushState = (...args) => {
        pushState(...args);
        check();
    };

    history.replaceState = (...args) => {
        replaceState(...args);
        check();
    };

    window.addEventListener('popstate', check);
    window.addEventListener('hashchange', check);

    return () => {
        history.pushState = pushState;
        history.replaceState = replaceState;
        window.removeEventListener('popstate', check);
        window.removeEventListener('hashchange', check);
    };
}
