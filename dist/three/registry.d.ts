import * as THREE from 'three';
export type PartDisplay = 'solid' | 'ghost' | 'wire' | 'hidden';
export interface PartEntry {
    id: string;
    object: THREE.Object3D;
    /** Local position when assembled. */
    base: THREE.Vector3;
    /** Local offset applied at explode factor 1. */
    explode: THREE.Vector3;
    /** Current explode factor of this part (0 assembled .. 1 exploded). */
    factor: number;
    /** Meshes that belong to this part (not to nested parts). */
    meshes: THREE.Mesh[];
    display: PartDisplay;
    /** Optional extra explode motion (e.g. buckets flying out radially). */
    custom?: (f: number) => void;
    /** See `PartFraming`. */
    frame?: THREE.Box3;
    viewDir?: THREE.Vector3;
}
/** How a part is framed when it is selected, when its whole box does not say it. Both optional, for `PartRegistry.add`. */
export interface PartFraming {
    /**
     * What `frameParts` brings the camera to, in the world's coordinates with the part assembled (it follows the part's explode), instead of everything
     * in the part: the end of a 200 m line, the rim of a 16 m slab. `frameAll`, the sheet's envelope and a part shown alone (the others hidden) keep its whole box.
     */
    frame?: THREE.Box3;
    /** Where the camera stands, seen from the part, when this part alone is framed (any length): around what hides it. Without it, the camera keeps its direction. */
    viewDir?: THREE.Vector3;
}
export declare class PartRegistry {
    readonly parts: Map<string, PartEntry>;
    /**
     * Register `object` as part `id`. Call it after the object has been positioned
     * and after its children parts (if any) were registered, so nested parts keep
     * their own meshes.
     */
    add(id: string, object: THREE.Object3D, explode?: THREE.Vector3, custom?: (f: number) => void, framing?: PartFraming): THREE.Object3D;
    get(id: string): PartEntry | undefined;
    ids(): string[];
    /** Set the explode factor of one part (0 assembled, 1 exploded). */
    setFactor(id: string, f: number): void;
    /** Same explode factor for every part. */
    setAllFactors(f: number): void;
    setDisplay(id: string, display: PartDisplay): void;
    setAllDisplay(display: PartDisplay): void;
    /** Meshes that can be clicked (visible, solid). */
    pickables(): THREE.Object3D[];
    /** Find the part id owning an intersected object. */
    partOf(o: THREE.Object3D | null): string | undefined;
    /** World-space bounding box of a part (including nested parts). */
    bounds(id: string): THREE.Box3;
    /** What `Stage.frameParts` frames for a part: its `frame`, moved with its explode, or its whole box (`bounds`). */
    frameBounds(id: string): THREE.Box3;
}
