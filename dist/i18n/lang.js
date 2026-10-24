// Tiny i18n layer: every user-facing text is either a UI key (see ui.ts) or an inline
// bilingual object `{ fr, en }` stored next to the data it describes.
let storageKey = 'lab:lang';
const listeners = new Set();
function detect() {
    try {
        const saved = localStorage.getItem(storageKey);
        if (saved === 'fr' || saved === 'en')
            return saved;
    }
    catch {
        /* storage unavailable: fall back to the browser language */
    }
    return navigator.language?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}
let current = detect();
/** Where the chosen language is remembered (one key per lab). Call once, before the app mounts. */
export function configureI18n(opts) {
    storageKey = opts.storageKey;
    current = detect();
    if (typeof document !== 'undefined')
        document.documentElement.lang = current;
}
export function getLang() {
    return current;
}
export function setLang(lang) {
    if (lang === current)
        return;
    current = lang;
    try {
        localStorage.setItem(storageKey, lang);
    }
    catch {
        /* ignore */
    }
    document.documentElement.lang = lang;
    listeners.forEach((fn) => fn(lang));
}
export function onLangChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}
/** Resolve a bilingual value (or pass a plain string through). */
export function tr(value) {
    if (value === undefined)
        return '';
    return typeof value === 'string' ? value : value[current];
}
/** Shorthand to build a bilingual value. */
export function l(fr, en) {
    return { fr, en };
}
