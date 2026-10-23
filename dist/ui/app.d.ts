import type { Stage } from '../three';
import { AppContext } from './context';
import type { DisplayController } from './display';
import type { LabDefinition, LabSim } from './lab';
import type { Store } from './state';
export declare class App<S extends LabSim = any> {
    private def;
    private store;
    private display;
    readonly ctx: AppContext<S>;
    private header;
    private rail;
    private panel;
    private panelBody;
    private toolbar;
    private strip;
    private stripValues;
    private stripAlarms;
    private stripClock;
    private peek;
    private panelToggle;
    private viewer;
    private simPanel;
    private lastStrip;
    private lastAlarmKey;
    /** Worlds already framed once (the first visit starts on an overview). */
    private visited;
    constructor(def: LabDefinition<S>, host: HTMLElement, viewport: HTMLElement, stage: Stage, store: Store, display: DisplayController);
    private onState;
    private applyCutaway;
    renderAll(): void;
    private renderHeader;
    /** Modes with content in this lab (a mode without content is hidden, never reinvented). */
    private availableModes;
    private renderRail;
    private renderPanel;
    /** Render the current drawing (keepView: keep zoom/pan, e.g. after a language change). */
    private showDrawing;
    private renderToolbar;
    private renderPeek;
    private renderStrip;
    /** Per-frame UI work (throttled). */
    tick(dt: number): void;
}
