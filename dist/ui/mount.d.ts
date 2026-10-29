import { Stage } from '../three';
import type { AppContext } from './context';
import type { LabDefinition, LabSim } from './lab';
import { type Store } from './state';
export interface MountOptions {
    /** Root element of the application grid (`#app`). */
    app: HTMLElement;
    /** Element the 3D canvas lives in (`#viewport`, a child of `app`). */
    viewport: HTMLElement;
    /** Expose `window.__lab = { stage, engine, store }` (and `narration`, when the lab has one) for debugging (pass the dev-mode flag). */
    expose?: boolean;
}
export interface MountedLab {
    stage: Stage;
    store: Store;
    ctx: AppContext;
}
/**
 * Boot a lab: the shared renderer with the lab's 3D worlds, the application shell, deep links
 * (`#scene/part`) and the render loop that steps the simulation.
 *
 * Returns `null` when the browser has no WebGL: the page then shows a message (French and English) instead of the lab.
 */
export declare function mountLab<S extends LabSim>(def: LabDefinition<S>, opts: MountOptions): MountedLab | null;
