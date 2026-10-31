import type { DrawingSheet } from '../drawings/types';
export declare class DrawingViewer {
    private sheets;
    private onNavigate;
    readonly el: HTMLDivElement;
    private stage;
    private bar;
    private svg;
    private serialized;
    private sheet;
    private base;
    private zoom;
    private pan;
    private pointers;
    private pinchDist;
    constructor(sheets: () => DrawingSheet[], onNavigate: (id: string) => void);
    /** Render a sheet (re-render on language change by calling again). */
    show(sheet: DrawingSheet, keepView?: boolean): void;
    private renderBar;
    /** Fit the whole sheet in the stage. */
    fit(): void;
    private apply;
    private zoomAt;
    private zoomBy;
    private onWheel;
    private onDown;
    private onMove;
    private fileName;
    download(): void;
    /** Print on A3 landscape through a hidden frame (no pop-up). */
    print(): void;
}
