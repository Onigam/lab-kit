export type Mode = 'explore' | 'assembly' | 'install' | 'sim' | 'plans' | 'lessons' | 'parts' | 'about';
export interface UiState {
    scene: string;
    mode: Mode;
    selected: string | null;
    isolate: boolean;
    xray: boolean;
    explode: number;
    cutaway: boolean;
    schematic: boolean;
    labels: 'main' | 'all' | 'none';
    /** Current step index of the active guide (assembly or install). */
    step: number;
    playing: boolean;
    ghost: boolean;
    autoFrame: boolean;
    lesson: string | null;
    /** Mobile: bottom sheet expanded. */
    sheet: boolean;
    /** Desktop: side panel shown (hide it to give the whole width to the 3D view). */
    panelOpen: boolean;
    /** Drawing shown in the "Plans" mode. */
    drawing: string | null;
}
type Listener = (s: UiState, prev: UiState) => void;
export declare class Store {
    state: UiState;
    private listeners;
    constructor(state: UiState);
    set(patch: Partial<UiState>): void;
    on(fn: Listener): () => void;
}
/** A fresh store with the lab's starting world. */
export declare function createStore(scene: string): Store;
export {};
