import { type L } from '../i18n';
export type Pt = [number, number];
export type Text = string | L;
export declare const PAPER: {
    w: number;
    h: number;
    margin: number;
};
export declare const INK = "#1d2b3a";
export declare const INK_2 = "#5b6878";
export declare const COLORS: {
    ink: string;
    muted: string;
    water: string;
    waterFill: string;
    dcPos: string;
    dcNeg: string;
    acL: string;
    acN: string;
    pe: string;
    signal: string;
    /** Safety / protection elements (jet deflectors, protective devices). */
    accent: string;
    red: string;
    copper: string;
    paper: string;
};
/** Line weights (paper mm), close to ISO 128: thick outlines, thin details. */
export declare const W: {
    thick: number;
    medium: number;
    thin: number;
};
export type HatchKind = 'steel' | 'alu' | 'plastic' | 'rubber' | 'wood' | 'earth' | 'water' | 'copper' | 'pmma';
export interface Stroke {
    /** Paper-mm width (default thick for shapes, thin for details). */
    w?: number;
    color?: string;
    /** 'center' dash-dot, 'hidden' dashed, 'phantom' long dash-double-dot, or a custom array (paper mm). */
    dash?: 'center' | 'hidden' | 'phantom' | number[];
    fill?: string;
    /** Section hatching (adds a pattern fill on top of `fill`). */
    hatch?: HatchKind;
    opacity?: number;
}
export interface TextOpts {
    /** Cap height in paper mm (default 2.5). */
    size?: number;
    anchor?: 'start' | 'middle' | 'end';
    weight?: 'normal' | 'bold';
    /** Degrees, counter-clockwise like the model. */
    rotate?: number;
    color?: string;
    mono?: boolean;
    italic?: boolean;
    /** Vertical alignment relative to the point. */
    baseline?: 'top' | 'middle' | 'bottom';
    /** White halo behind the text so it reads over lines. */
    halo?: boolean;
}
/** Format a model length for a dimension (mm). */
export declare function fmt(v: number): string;
/** One A3 drawing sheet. */
/** Lab-wide texts of the title block (project name, disclaimer, default drawing date). */
export interface DrawingProject {
    project: Text;
    disclaimer: Text;
    /** Default date shown in the title block, e.g. '2026-10-22'. */
    date: string;
}
/** Set the title-block texts used by every sheet of this lab. */
export declare function configureDrawings(p: Partial<DrawingProject>): void;
export declare class Drawing {
    readonly svg: SVGSVGElement;
    /** Layers: content under annotations. */
    readonly content: SVGGElement;
    readonly notes: SVGGElement;
    constructor();
    /** Model view: model mm (Y up) mapped to paper mm with `scale` (e.g. 1/5), origin at paper (x, y). */
    view(x: number, y: number, scale: number): View;
    /** Paper-space view (1:1, Y down) for diagrams, tables and notes. */
    paper(): View;
    /** Border frame, zone marks and title block. */
    frame(tb: TitleBlock): void;
    /** Simple table in paper space. Returns its height. */
    table(x: number, y: number, cols: {
        label: Text;
        w: number;
        align?: 'start' | 'middle' | 'end';
    }[], rows: Text[][], rowH?: number): number;
    /** Serialise to a standalone SVG file. */
    serialize(): string;
}
export interface TitleBlock {
    title: Text;
    subtitle?: Text;
    number: string;
    scale: string;
    rev?: string;
    date?: string;
}
/** Drawing primitives in model coordinates (or paper coordinates for a paper view). */
export declare class View {
    readonly drawing: Drawing;
    private layer;
    readonly ox: number;
    readonly oy: number;
    readonly scale: number;
    private paperSpace;
    constructor(drawing: Drawing, layer: SVGGElement, ox: number, oy: number, scale: number, paperSpace?: boolean);
    /**
     * Paper-space sub-view drawn in a transformed group (symbols): local origin at `at`
     * (paper mm), rotated by `rotate` degrees (counter-clockwise) and scaled.
     */
    group(at: Pt, rotate?: number, scale?: number): View;
    /** Model point -> paper point. */
    map([x, y]: Pt): Pt;
    /** A view translated in model units (e.g. to place a sub-view or a symbol). */
    offset(dx: number, dy: number): View;
    private style;
    private add;
    line(a: Pt, b: Pt, s?: Stroke): SVGElement;
    polyline(pts: Pt[], s?: Stroke & {
        closed?: boolean;
    }): SVGElement;
    /** Axis-aligned rectangle given two opposite corners. */
    rect(a: Pt, b: Pt, s?: Stroke): SVGElement;
    /** Rectangle with rounded corners (radius in model units). */
    roundRect(a: Pt, b: Pt, r: number, s?: Stroke): SVGElement;
    circle(c: Pt, r: number, s?: Stroke): SVGElement;
    /** Arc from a0 to a1 (degrees, counter-clockwise in the model, 0 = +X). */
    arc(c: Pt, r: number, a0: number, a1: number, s?: Stroke): SVGElement;
    /** Raw SVG path in paper coordinates of this view's origin (for complex symbols). */
    pathPaper(d: string, s?: Stroke): SVGElement;
    /** Thin dash-dot centre line, extended `over` model units beyond both ends. */
    center(a: Pt, b: Pt, over?: number): SVGElement;
    text(p: Pt, str: Text, o?: TextOpts): SVGElement;
    /**
     * Linear dimension between model points a and b.
     * `offset` is in paper mm: for 'h' a positive value puts the line below the lower point,
     * for 'v' to the right of the rightmost point; for 'aligned' it is along the left normal.
     */
    dim(a: Pt, b: Pt, offset: number, o?: {
        dir?: 'h' | 'v' | 'aligned';
        label?: Text;
        prefix?: string;
        suffix?: string;
        size?: number;
        color?: string;
    }): void;
    /** Diameter dimension across a circle along `angle` (degrees), label outside on the right. */
    dimDiameter(c: Pt, r: number, angle?: number, o?: {
        label?: Text;
        size?: number;
    }): void;
    /** Radius dimension from the centre to the circle along `angle` (degrees). */
    dimRadius(c: Pt, r: number, angle?: number, o?: {
        label?: Text;
        size?: number;
    }): void;
    /** Leader from a model point to a paper-space label position (relative offset in paper mm). */
    leader(at: Pt, dx: number, dy: number, label: Text, o?: {
        balloon?: boolean;
        size?: number;
        color?: string;
    }): void;
    /** Section-cut indicator (A–A) between two model points, arrows pointing along `toward` (+1 / -1 normal side). */
    sectionMark(a: Pt, b: Pt, letter: string, toward?: 1 | -1): void;
    /** View caption under a view (e.g. "VUE DE FACE — 1:5"). */
    caption(p: Pt, title: Text, scale?: string): void;
}
