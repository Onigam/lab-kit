import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { CameraPose, Hotspot, SceneId, SceneModule } from './types';
/**
 * Part of the 3D view covered by the interface (the bottom sheet and the toolbar on a phone), in CSS pixels from each
 * edge of the view. `frameAll` / `frameBox` fit the subject in the rest and the projection is centred on it.
 */
export interface ViewInsets {
    top: number;
    right: number;
    bottom: number;
    left: number;
}
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
    private factories;
    private fly;
    private size;
    /**
     * Covered part of the view: what the interface says covers it (`insets`), the room kept at the bottom of a narrow view
     * for the floating toolbar (`narrowBottom`), and what is applied now (`insetsNow`, eased towards their sum).
     */
    private insets;
    private narrowBottom;
    private insetsNow;
    private lastFraming;
    private reframeTimer;
    private warmed;
    /** A point set by `setPivot`: the rotation turns around it when a press hits no part. */
    private pivot;
    private grab;
    private raycaster;
    private pointer;
    private downAt;
    private hovered;
    /** Parts outlined like the selection without being selected (the narration points at them), see `setEmphasis`. */
    private emphasis;
    private cameraListeners;
    /** Presses that started on the canvas and have not moved far enough to be a drag yet. */
    private gestures;
    active: SceneModule;
    /** Label visibility: 'main' hides minor labels, 'all' shows them, 'none' hides every label. */
    labelMode: 'main' | 'all' | 'none';
    selected: string | null;
    /** Explode factor the interface is heading to: the overview frames the device as it will be, not as it is now. */
    explodeTarget: number;
    constructor(host: HTMLElement, events: StageEvents);
    register(mod: SceneModule): void;
    /** Declare a world that is built on its first visit (`SceneDef.module` as a factory). */
    defineScene(id: SceneId, make: () => SceneModule): void;
    /** The world `id`, built now if it was declared with a factory and nobody has visited it yet. */
    get(id: SceneId): SceneModule | undefined;
    setActive(id: SceneId, pose?: CameraPose): void;
    /**
     * Tell `fn` whenever the visitor takes the camera by hand: a drag that moves (turn, pan, pinch), the wheel. A click that does
     * not move is not one. The camera flights the application starts itself never call it. Returns the function that stops it.
     */
    onUserCamera(fn: () => void): () => void;
    private cameraTaken;
    private moveGesture;
    /** Smoothly move the camera to an authored pose. */
    flyTo(pose: CameraPose, duration?: number): void;
    private startFly;
    /** Tell the stage how much of the view the interface covers; the subject is framed in the rest. */
    setViewInsets(next: Partial<ViewInsets>, animate?: boolean): void;
    /**
     * Room to keep at the bottom of a narrow view (a tablet, a narrow window) for the toolbar that floats over it. A wide
     * view keeps the whole picture, as every lab has tuned it; a narrow one is filled by the subject, so the toolbar would
     * cover its foot: the room grows from nothing at an aspect ratio of 1 to all of it at 0.7.
     */
    setNarrowClearance(bottom: number, animate?: boolean): void;
    private insetsChanged;
    /** How narrow the view is: 0 at an aspect ratio of 1 or more, 1 at 0.7 or less. */
    private narrowness;
    /** Where the covered part of the view is heading: the interface's insets plus the room for the toolbar of a narrow view. */
    private targetInsets;
    private get hasInsets();
    /** The free part of the view, in CSS pixels. */
    private freeSize;
    /** Field of view that must hold the subject: the narrower of the free view's two directions. */
    private fitFov;
    /** Camera aspect, projection centre (the middle of the free view) and projection matrix. */
    private applyView;
    private stepInsets;
    /** Play the last framing again (after a resize or a change of the free area) unless the visitor took the camera. */
    reframe(duration?: number): void;
    /** The overview follows the explode slider: frame the device again once the visitor stops moving it. */
    refitOverview(): void;
    /**
     * Distance at which `box`, seen along `d`, fills the free view with `padding` to spare: its real extents are projected
     * (a tall, narrow device in a tall, narrow view is not a sphere).
     */
    private extentsDistance;
    private fitBox;
    /** Frame a world-space box, keeping the current viewing direction (or `dir`), in the part of the view left free. */
    frameBox(box: THREE.Box3, padding?: number, duration?: number, dir?: THREE.Vector3, minRadius?: number): void;
    /** Overview: frame every visible part of the active world from its home direction. */
    frameAll(duration?: number): void;
    frameParts(ids: string[], padding?: number, dir?: THREE.Vector3, duration?: number): void;
    home(): void;
    /**
     * The steps that compile the shaders of a world ahead of use: the world as it is, the transparent and wire materials of
     * X-ray, isolate and guide previews (on no mesh until used), the section tool (`variant` switches it on and returns what
     * undoes it) and the outline. The caller runs them one at a time while the machine is idle, so the first X-ray,
     * selection or section does not stall a frame. Empty once the world has been warmed.
     */
    warmSteps(id: SceneId, variant?: () => () => void): (() => void)[];
    /** Draw the world once into a one-pixel target: the shaders it needs (shadows included) exist before the first real frame. */
    private drawScratch;
    /** Run the outline passes once on a scratch target: their depth and mask shaders are compiled before the first use. */
    private warmOutline;
    setSelection(id: string | null): void;
    /** Outline a set of parts with the selection colour (guide steps). */
    highlight(ids: string[]): void;
    /** Outline these parts like the selection (the spoken guide points at them); `[]` clears. A change of world clears it too. */
    setEmphasis(ids: string[]): void;
    refreshOutline(): void;
    refreshLabels(): void;
    /** The parts under the pointer, nearest first (the clipped-away half of a part in section mode is skipped). */
    private cast;
    private pick;
    /**
     * Where the next rotation of the camera turns when a press hits no part (default: the point the camera looks at, which is
     * what OrbitControls does). Any framing (`frameAll`, `frameBox`, `frameParts`, `flyTo`) and any change of world sets it back
     * to the target of the camera. `null` clears it.
     */
    setPivot(point: THREE.Vector3 | null): void;
    /**
     * A press with the main button (or one finger) on a solid part: the camera will turn around the point that was pressed, so
     * the part stays under the pointer instead of sweeping across the view as it does when the camera turns around a distant
     * target. OrbitControls does not rotate for this gesture (`enableRotate` is off until it ends); it still pans, zooms and
     * pinches. A press on nothing, or with a modifier key, is left to OrbitControls, around the target of the camera.
     */
    private beginGrab;
    private moveGrab;
    private releaseGrab;
    /** Stop a grab at once (a flight starts, the world changes). */
    private endGrab;
    /** Apply a share of the angles still to turn, as OrbitControls does with its damping (once per frame and per move). */
    private stepGrab;
    /**
     * Turn the camera around `p` as one rigid body: `yaw` about the world up axis, then `pitch` about its own right axis, the
     * polar angle kept between the limits of the controls. `p` stays exactly where it is on the screen. The target of the controls
     * goes on the line of sight at the distance of `p`, so that its zoom and pan state stay coherent with the new view.
     */
    private rotateAbout;
    private resize;
    render(dt: number): void;
}
