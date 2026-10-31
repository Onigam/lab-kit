import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { SSAARenderPass } from 'three/examples/jsm/postprocessing/SSAARenderPass.js';
import type { ToneName } from './look-policy';
/** The stage's look. The defaults are the labs' picture; a film capture adds `supersample` and `ao` through `Stage.setLook`. */
export interface LookOptions {
    /** Multisampling of the scene pass, 4 or 0 (set from the device at start; see `planQuality`). */
    msaa: number;
    /** FXAA on the final image (the anti-aliasing of a device without MSAA). */
    fxaa: boolean;
    /** Highest pixel ratio drawn (set from the device at start, at most 2). */
    maxPixelRatio: number;
    /** Lower the pixel ratio when frames are slow (off in an automated browser, with `?quality=full`, or set here). */
    adaptive: boolean;
    /** Radius, in texels, of the soft edge of the shadows: applied to every light still at three's default (1). */
    shadowRadius: number;
    /** Films: the scene drawn 2^n times with sub-pixel jitter and averaged (0 = off, 2 = 4 samples, 3 = 8). Deterministic. */
    supersample: number;
    /** Films: ambient occlusion (three's GTAO) in the worlds that ask for it (by default the paper studios). */
    ao: boolean;
    /** Films: strength of the ambient occlusion (0..1). */
    aoIntensity: number;
}
export declare const LOOK_DEFAULTS: LookOptions;
export declare const toneMappingOf: (t: ToneName) => THREE.ToneMapping;
/**
 * The composer of the stage. Its read and write targets swap at every pass that needs it, so with the scene pass free to
 * land in either, both would have to be multisampled. Here the scene pass always draws into the first target, the only
 * multisampled one; the second has no depth buffer (the passes after the scene draw full-screen quads). At 390 × 844 at
 * pixel ratio 2 that is about 58 MB less than two multisampled targets.
 */
export declare class LabComposer extends EffectComposer {
    constructor(renderer: THREE.WebGLRenderer, samples: number);
    private static sceneTarget;
    /** Samples of the scene target (4 or 0); the composer object stays the same (a film's capture may hold it). */
    setSamples(samples: number): void;
    /** Take every pass out (the chain is built again). */
    clearPasses(): void;
    render(deltaTime?: number): void;
}
/** Bytes per drawn pixel of the composer's targets (half-float RGBA 8 B, depth 4 B; samples multiply both), for the docs. */
export declare function composerBytesPerPixel(samples: number): {
    pinned: number;
    both: number;
    none: number;
};
/** The saturation of the final image, in display space (a world's `look.saturation`). */
export declare const SaturationShader: {
    name: string;
    uniforms: {
        tDiffuse: {
            value: THREE.Texture | null;
        };
        uSat: {
            value: number;
        };
    };
    vertexShader: string;
    fragmentShader: string;
};
/**
 * The warm « paper studio » the paper-studio worlds are lit and reflected by (through `PMREMGenerator.fromScene`): a room in
 * the colour of the labs' paper, a warm ceiling panel (the key), a cooler window on one side, a warm reflector on the other,
 * a sand-coloured floor (the bounce of the table). Procedural, no asset. As bright on average as three's `RoomEnvironment`,
 * so metals keep their value; warmer, so brass and steel no longer reflect a blue-white room.
 */
export declare function paperEnvironment(): THREE.Scene;
/** Supersampling that draws the shadow maps once per frame, not once per sample (nothing moves between the samples). */
export declare class FilmSSAAPass extends SSAARenderPass {
    render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget, deltaTime: number, maskActive: boolean): void;
}
/** Ambient occlusion for films (three's GTAO, which draws the scene once more for its normals), clipped as the section is. */
export declare function makeAO(scene: THREE.Scene, camera: THREE.PerspectiveCamera): GTAOPass;
/** Parameters of the occlusion for a reach of `radius` metres. */
export declare function aoParameters(radius: number): {
    radius: number;
    distanceExponent: number;
    thickness: number;
    scale: number;
    samples: number;
};
