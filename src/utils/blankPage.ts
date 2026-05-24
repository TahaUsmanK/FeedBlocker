export function forceBlankPage() {
    const target = window.top ?? window;
    if (target.location.href !== 'about:blank') {
        target.location.replace('about:blank');
    }
}
