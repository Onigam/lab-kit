export interface SheetDragOpts {
    /** The sheet (a fixed element whose position the stylesheet derives from `--sheet-off`). */
    panel: HTMLElement;
    /** The strip at the top of the sheet that is always on screen. */
    grip: HTMLElement;
    isOpen(): boolean;
    setOpen(open: boolean): void;
}
export declare function bindSheetDrag({ panel, grip, isOpen, setOpen }: SheetDragOpts): void;
