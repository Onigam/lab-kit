import type { Stage } from '../three';
import { AppContext } from './context';
import { type DisplayController } from './display';
import type { LabDefinition, LabSim } from './lab';
import type { Store } from './state';
export declare class App<S extends LabSim = any> {
    private def;
    private store;
    private display;
    readonly ctx: AppContext<S>;
    private header;
    private rail;
    /** The modes row: it scrolls on a phone (a fade shows where it goes on); on a desktop it is transparent to layout. */
    private railScroll;
    private panel;
    private panelBody;
    private grip;
    private toolbar;
    private toolbarRow;
    private strip;
    private stripValues;
    private stripAlarms;
    private stripClock;
    private peek;
    private panelToggle;
    private viewer;
    /** The spoken guide's dock and header button (only when the lab has a `narration`). */
    private narration;
    private narrationActive;
    private viewportEl;
    private simPanel;
    private lastStrip;
    private lastAlarmKey;
    /** Worlds already framed once (the first visit starts on an overview). */
    private visited;
    constructor(def: LabDefinition<S>, host: HTMLElement, viewport: HTMLElement, stage: Stage, store: Store, display: DisplayController);
    /** The spoken guide changed: its buttons appear with the manifest, the dock takes room from the 3D view while it is up. */
    private onNarration;
    /** When the machine is idle, compile the shaders of a world (and of the section tool and the outline), a step at a time. */
    private warmLater;
    private onState;
    /**
     * On a phone the bottom sheet (and the toolbar that rides on it) covers the lower part of the 3D view; on a short
     * landscape screen the toolbar is a row at the top. The stage frames the subject in what is left.
     */
    private watchLayout;
    private updateInsets;
    /** Tell the stylesheet how tall the toolbar is: the spoken guide's dock sits above it. */
    private syncTools;
    private applyCutaway;
    renderAll(): void;
    private renderHeader;
    /** Modes with content in this lab (a mode without content is hidden, never reinvented). */
    private availableModes;
    private renderRail;
    /** Scroll the rail (a phone's row, or a short screen's column) so the current mode is in view. */
    private revealActiveMode;
    private renderPanel;
    /** Render the current drawing (keepView: keep zoom/pan, e.g. after a language change). */
    private showDrawing;
    private renderToolbar;
    private renderPeek;
    private renderStrip;
    /** Per-frame UI work (throttled). */
    tick(dt: number): void;
}
