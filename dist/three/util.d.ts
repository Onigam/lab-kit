import * as THREE from 'three';
/** Create a mesh that casts/receives shadows, optionally positioned/rotated. */
export declare function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, pos?: [number, number, number], rot?: [number, number, number]): THREE.Mesh;
/** Named group helper. */
export declare function group(name: string, pos?: [number, number, number]): THREE.Group;
/** Deterministic PRNG (mulberry32) so procedural scenes are identical on every load. */
export declare function rng(seed: number): () => number;
/** Canvas-backed texture; call `redraw()` on the returned handle to update it. */
export declare function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): {
    texture: THREE.CanvasTexture;
    redraw: (fn?: typeof draw) => void;
};
/** Hex socket-head / hex bolt head pointing along +Y, base at y=0. */
export declare function boltHead(radius: number, height: number, material: THREE.Material): THREE.Mesh;
/** Tube following a polyline with rounded corners (pipes, cables). */
export declare function pipeAlong(points: THREE.Vector3[], radius: number, material: THREE.Material, opts?: {
    bend?: number;
    radialSegments?: number;
    tubularSegments?: number;
}): THREE.Mesh;
/** Polyline -> CurvePath with circular-ish fillets of radius `bend` at each corner. */
export declare function roundedPath(points: THREE.Vector3[], bend: number): THREE.CurvePath<THREE.Vector3>;
/** Ease helpers for animations. */
export declare const ease: {
    inOut: (t: number) => number;
    out: (t: number) => number;
};
export declare const clamp: (v: number, a: number, b: number) => number;
export declare const lerp: (a: number, b: number, t: number) => number;
/** Exponential smoothing factor independent of frame rate. */
export declare function damp(current: number, target: number, lambda: number, dt: number): number;
