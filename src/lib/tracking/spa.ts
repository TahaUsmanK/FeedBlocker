export type NavigationCallback = () => void;

/** Detect SPA route changes (History API + polling fallback) */
export function watchSpaNavigation(onNavigate: NavigationCallback): () => void {
    let lastHref = location.href;

    const check = () => {
        if (location.href !== lastHref) {
            lastHref = location.href;
            onNavigate();
        }
    };

    const interval = window.setInterval(check, 500);

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
        clearInterval(interval);
        history.pushState = pushState;
        history.replaceState = replaceState;
        window.removeEventListener('popstate', check);
        window.removeEventListener('hashchange', check);
    };
}
