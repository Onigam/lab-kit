// Light or dark, as on the showcase: the system's setting by default, the visitor's choice once made. Only the frame changes: the
// 3D worlds and the A3 sheets keep their own colours in both.
const KEY = 'onigam-labs:theme';
const listeners = new Set();
const system = () => typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
const notify = () => listeners.forEach((fn) => fn());
/** Apply the visitor's earlier choice and follow the system's setting. Call once, before the application is drawn. */
export function initTheme() {
    try {
        const saved = localStorage.getItem(KEY);
        if (saved === 'light' || saved === 'dark')
            document.documentElement.dataset.theme = saved;
    }
    catch {
        /* storage can be blocked: the choice then lasts for the visit only */
    }
    system()?.addEventListener('change', notify);
}
export function isDark() {
    if (typeof document === 'undefined')
        return false;
    const chosen = document.documentElement.dataset.theme;
    return chosen ? chosen === 'dark' : !!system()?.matches;
}
export function toggleTheme() {
    const next = isDark() ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
        localStorage.setItem(KEY, next);
    }
    catch {
        /* see above */
    }
    notify();
}
export function onThemeChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}
