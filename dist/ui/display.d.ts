import type { GuideStep } from '../content/types';
import type { Stage } from '../three/core';
import type { AnyLab, GuideDef } from './lab';
import type { Store } from './state';
/** The guide of the assembly or installation mode, if the lab has one. */
export declare function guideDef(def: AnyLab, mode: string): GuideDef | undefined;
/** World a step plays in (a guide may cross several worlds). */
export declare function stepScene(g: GuideDef, i: number): string;
/** Every world the guide plays in. */
export declare function guideScenes(g: GuideDef): Set<string>;
/** Steps of the guide playing in this mode when `scene` is one of its worlds, if any. */
export declare function guideFor(def: AnyLab, mode: string, scene: string): GuideStep[] | null;
export declare class DisplayController {
    private def;
    private stage;
    private store;
    private explode;
    private stepKey;
    private stepStart;
    private time;
    private lastExplodeUi;
    private refitAt;
    constructor(def: AnyLab, stage: Stage, store: Store);
    update(dt: number): void;
    /** Frame the parts of the new step (at their final position). */
    private onStepChange;
}
