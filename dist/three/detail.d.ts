import * as THREE from 'three';
/** Chain a shader edit after a material's own `onBeforeCompile`, and give the program its own cache key. */
export declare function patchMaterial(mat: THREE.Material, key: string, edit: (shader: THREE.WebGLProgramParametersWithUniforms) => void): void;
/**
 * The grass of the meadow: patches of drier and greener grass tens of metres across, tufts a metre across, and their bump in
 * the light; on top of the ground's vertex colours. Stays put in the world (x, z).
 */
export declare function grassDetail(mat: THREE.MeshStandardMaterial): void;
/**
 * Wear on the solid parts under `root`: a slow variation of colour and roughness, as no made part is one flat colour. In each
 * mesh's own coordinates, so it moves with the part (explode, the rotor's turn). `freq`: cells per metre of the variation (a
 * hillside 3, a bench 60). Transparent materials and the ones `skip` names are left alone. A material may ask for its own wear
 * in `userData.wear`: `tint` (the colour of its stains) and `amount` (1 by default).
 */
export declare function applyWear(root: THREE.Object3D, freq: number, skip?: (m: THREE.Mesh) => boolean): void;
/** Where a contact shadow stops, by the distance from the camera. */
export interface ShadowFade {
    /** Metres at which it starts to weaken, and at which nothing is left. Give it the fog of the world, as the shadow itself is not fogged. */
    near: number;
    far: number;
}
/** The same as `contactShadow` for a round foot: a dark ring around a disc of radius `r`, fading over `falloff`, on a paper floor. */
export declare function contactRing(r: number, falloff: number, strength?: number, fade?: ShadowFade): THREE.Mesh;
/**
 * The darker border on a floor around what stands on it (the ambient light the floor does not get next to a body): a footprint
 * of `w` by `d` metres, centred, fading over `falloff`. Multiplied over the floor. Lay it between the floor and the body's
 * underside: in front of the floor by depth alone, behind the body's foot, so the body always covers it. Inside the footprint
 * it darkens nothing, so a pixel of the body's foot that it might reach is never darkened. Not a part: no shadow, no picking. `fade`: let it go with
 * the distance, for a world with fog.
 */
export declare function contactShadow(w: number, d: number, falloff: number, strength?: number, fade?: ShadowFade): THREE.Mesh;
