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
}
export declare class PartRegistry {
    readonly parts: Map<string, PartEntry>;
    /**
     * Register `object` as part `id`. Call it after the object has been positioned
     * and after its children parts (if any) were registered, so nested parts keep
     * their own meshes.
     */
    add(id: string, object: THREE.Object3D, explode?: THREE.Vector3, custom?: (f: number) => void): THREE.Object3D;
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
}
