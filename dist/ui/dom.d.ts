type Child = Node | string | number | null | undefined | false;
type Attrs = Record<string, string | number | boolean | EventListener | undefined>;
export declare function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: Attrs, ...children: Child[]): HTMLElementTagNameMap[K];
export declare function append(el: Element, children: Child[]): void;
/**
 * Render trusted bilingual content that may contain **bold** markers.
 * Text is inserted with text nodes only (no innerHTML).
 */
export declare function rich(text: string): DocumentFragment;
/** Replace the children of `el`, skipping null/false entries. */
export declare function fill(el: Element, ...children: Child[]): void;
export declare function clear(el: Element): void;
/** Inline SVG icon from a path list (24×24, stroke icons). */
export declare function icon(paths: string, size?: number): SVGSVGElement;
export declare const ICONS: {
    explore: string;
    assembly: string;
    install: string;
    sim: string;
    plans: string;
    download: string;
    print: string;
    lessons: string;
    parts: string;
    about: string;
    prev: string;
    next: string;
    play: string;
    pause: string;
    home: string;
    close: string;
    video: string;
    focus: string;
    isolate: string;
    reset: string;
    chevron: string;
    bolt: string;
    drop: string;
    sun: string;
    warn: string;
    ok: string;
    menu: string;
};
export {};
