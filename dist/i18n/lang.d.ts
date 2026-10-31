export type Lang = 'fr' | 'en';
export interface L {
    fr: string;
    en: string;
}
/** Where the chosen language is remembered (one key per lab). Call once, before the app mounts. */
export declare function configureI18n(opts: {
    storageKey: string;
}): void;
export declare function getLang(): Lang;
export declare function setLang(lang: Lang): void;
export declare function onLangChange(fn: (lang: Lang) => void): () => void;
/** Resolve a bilingual value (or pass a plain string through). */
export declare function tr(value: L | string | undefined): string;
/** Shorthand to build a bilingual value. */
export declare function l(fr: string, en: string): L;
