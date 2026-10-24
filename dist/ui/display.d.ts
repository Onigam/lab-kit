import type { GuideStep } from '../content/types';
import type { Stage } from '../three/core';
import type { AnyLab } from './lab';
import type { Store } from './state';
/** Steps of the guide playing in this mode and world, if any. */
export declare function guideFor(def: AnyLab, mode: string, scene: string): GuideStep[] | null;
export declare class DisplayController {
    private def;
    private stage;
    private store;
    private explode;
    private stepKey;
    private stepStart;
    private time;
    constructor(def: AnyLab, stage: Stage, store: Store);
    update(dt: number): void;
    /** Frame the parts of the new step (at their final position). */
    private onStepChange;
}
