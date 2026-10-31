import type { PartInfo } from '../content';
import type { Stage } from '../three';
import type { LabDefinition, LabSim, SceneDef } from './lab';
import { NarrationEngine } from './narration';
import type { Mode, Store, UiState } from './state';
/** The lab has content for this mode (a mode without content is hidden, never reinvented). */
export declare function hasMode(def: LabDefinition<any>, mode: string): boolean;
export declare class AppContext<S extends LabSim = any> {
    readonly def: LabDefinition<S>;
    readonly stage: Stage;
    readonly store: Store;
    private byId;
    /** The spoken guide, when the lab has one (`LabDefinition.narration`). */
    readonly narration: NarrationEngine | null;
    constructor(def: LabDefinition<S>, stage: Stage, store: Store);
    get ui(): UiState;
    get sim(): S;
    partInfo(id: string): PartInfo | undefined;
    sceneDef(id: string): SceneDef | undefined;
    /** Link to the lab's source video at a "mm:ss" timestamp. */
    videoUrl(ts: string): string;
    private get doneKey();
    lessonsDone(): Set<string>;
    markLessonDone(id: string): void;
    /** Switch to another 3D world (keeps the current mode when it makes sense). */
    gotoScene(scene: string): void;
    /** The whole device in view. Waits one frame after clearing "isolate" so the hidden parts are counted again. */
    overview(): void;
    setMode(mode: Mode): void;
    /** Select a part, switching world if needed, and frame it. */
    selectPart(id: string | null, opts?: {
        frame?: boolean;
        mode?: Mode;
    }): void;
}
