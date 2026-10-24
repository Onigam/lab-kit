import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { CameraPose, Hotspot, SceneId, SceneModule } from './types';
export interface StageEvents {
    onPick(partId: string | null): void;
    onDoublePick?(partId: string | null): void;
    onHotspot(h: Hotspot): void;
    onHover(partId: string | null): void;
}
export declare class Stage {
    private host;
    private events;
    readonly renderer: THREE.WebGLRenderer;
    readonly camera: THREE.PerspectiveCamera;
    readonly controls: OrbitControls;
    private labels;
    private composer;
    private renderPass;
    private outline;
    private outlineHover;
    private modules;
    private labelSets;
    private poses;
    private env;
    private fly;
    private raycaster;
    private pointer;
    private downAt;
    private hovered;
    active: SceneModule;
    /** Label visibility: 'main' hides minor labels, 'all' shows them, 'none' hides every label. */
    labelMode: 'main' | 'all' | 'none';
    selected: string | null;
    constructor(host: HTMLElement, events: StageEvents);
    register(mod: SceneModule): void;
    get(id: SceneId): SceneModule | undefined;
    setActive(id: SceneId, pose?: CameraPose): void;
    /** Smoothly move the camera. */
    flyTo(pose: CameraPose, duration?: number): void;
    /** Frame a world-space box, keeping the current viewing direction (or `dir`). */
    frameBox(box: THREE.Box3, padding?: number, duration?: number, dir?: THREE.Vector3, minRadius?: number): void;
    /** Overview: frame every visible part of the active world from its home direction. */
    frameAll(duration?: number): void;
    frameParts(ids: string[], padding?: number, dir?: THREE.Vector3): void;
    home(): void;
    setSelection(id: string | null): void;
    /** Outline a set of parts with the selection colour (guide steps). */
    highlight(ids: string[]): void;
    refreshOutline(): void;
    refreshLabels(): void;
    private pick;
    private resize;
    render(dt: number): void;
}
