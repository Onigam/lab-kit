import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { SSAARenderPass } from 'three/examples/jsm/postprocessing/SSAARenderPass.js';
export const LOOK_DEFAULTS = {
    msaa: 4,
    fxaa: false,
    maxPixelRatio: 2,
    adaptive: true,
    shadowRadius: 2,
    supersample: 0,
    ao: false,
    aoIntensity: 0.8,
};
const TONES = {
    aces: THREE.ACESFilmicToneMapping,
    neutral: THREE.NeutralToneMapping,
    agx: THREE.AgXToneMapping,
    linear: THREE.LinearToneMapping,
};
export const toneMappingOf = (t) => TONES[t] ?? THREE.ACESFilmicToneMapping;
/**
 * The composer of the stage. Its read and write targets swap at every pass that needs it, so with the scene pass free to
 * land in either, both would have to be multisampled. Here the scene pass always draws into the first target, the only
 * multisampled one; the second has no depth buffer (the passes after the scene draw full-screen quads). At 390 × 844 at
 * pixel ratio 2 that is about 58 MB less than two multisampled targets.
 */
export class LabComposer extends EffectComposer {
    constructor(renderer, samples) {
        super(renderer, LabComposer.sceneTarget(renderer, samples));
        this.renderTarget2.dispose();
        this.renderTarget2 = new THREE.WebGLRenderTarget(this.renderTarget1.width, this.renderTarget1.height, {
            type: THREE.HalfFloatType,
            depthBuffer: false,
        });
        this.renderTarget2.texture.name = 'LabComposer.post';
        this.writeBuffer = this.renderTarget2;
    }
    static sceneTarget(renderer, samples) {
        const size = renderer.getDrawingBufferSize(new THREE.Vector2());
        const t = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples });
        t.texture.name = 'LabComposer.scene';
        return t;
    }
    /** Samples of the scene target (4 or 0); the composer object stays the same (a film's capture may hold it). */
    setSamples(samples) {
        if (this.renderTarget1.samples === samples)
            return;
        const { width, height } = this.renderTarget1;
        this.renderTarget1.dispose();
        this.renderTarget1 = LabComposer.sceneTarget(this.renderer, samples);
        this.renderTarget1.setSize(width, height);
        this.readBuffer = this.renderTarget1;
    }
    /** Take every pass out (the chain is built again). */
    clearPasses() {
        for (const p of [...this.passes])
            this.removePass(p);
    }
    render(deltaTime) {
        this.readBuffer = this.renderTarget1;
        this.writeBuffer = this.renderTarget2;
        super.render(deltaTime);
    }
}
/** Bytes per drawn pixel of the composer's targets (half-float RGBA 8 B, depth 4 B; samples multiply both), for the docs. */
export function composerBytesPerPixel(samples) {
    const resolve = 8;
    const scene = samples > 0 ? samples * (8 + 4) + resolve : 8 + 4;
    return { pinned: scene + 8, both: 2 * scene, none: 2 * (8 + 4) };
}
/** The saturation of the final image, in display space (a world's `look.saturation`). */
export const SaturationShader = {
    name: 'LabSaturationShader',
    uniforms: {
        tDiffuse: { value: null },
        uSat: { value: 1 },
    },
    vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`,
    fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uSat;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D( tDiffuse, vUv );
      float l = dot( c.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
      gl_FragColor = vec4( clamp( mix( vec3( l ), c.rgb, uSat ), 0.0, 1.0 ), c.a );
    }`,
};
/**
 * The warm « paper studio » the paper-studio worlds are lit and reflected by (through `PMREMGenerator.fromScene`): a room in
 * the colour of the labs' paper, a warm ceiling panel (the key), a cooler window on one side, a warm reflector on the other,
 * a sand-coloured floor (the bounce of the table). Procedural, no asset. As bright on average as three's `RoomEnvironment`,
 * so metals keep their value; warmer, so brass and steel no longer reflect a blue-white room.
 */
export function paperEnvironment() {
    const scene = new THREE.Scene();
    const room = new THREE.Mesh(new THREE.BoxGeometry(30, 16, 30), new THREE.MeshBasicMaterial({ color: 0xefe6d3, side: THREE.BackSide }));
    room.position.y = 6;
    scene.add(room);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshBasicMaterial({ color: 0xc9b79a }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.9;
    scene.add(floor);
    const panel = (color, intensity, w, h, pos, rot) => {
        const m = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
        m.color.multiplyScalar(intensity);
        const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
        p.position.set(...pos);
        p.rotation.set(...rot);
        scene.add(p);
    };
    panel(0xfff4e6, 14, 10, 8, [2, 13.8, 2], [Math.PI / 2, 0, 0]);
    panel(0xf2f5f8, 7, 8, 6, [-14.8, 6, 0], [0, Math.PI / 2, 0]);
    panel(0xffe2bd, 4, 10, 4, [14.8, 3, -2], [0, -Math.PI / 2, 0]);
    panel(0xffffff, 5, 6, 3, [0, 5, -14.8], [0, 0, 0]);
    return scene;
}
/** Supersampling that draws the shadow maps once per frame, not once per sample (nothing moves between the samples). */
export class FilmSSAAPass extends SSAARenderPass {
    render(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
        const shadows = renderer.shadowMap;
        const auto = shadows.autoUpdate;
        shadows.autoUpdate = false;
        shadows.needsUpdate = true; // the first sample draws them; the shadow map clears the flag
        try {
            super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
        }
        finally {
            shadows.autoUpdate = auto;
        }
    }
}
/** Ambient occlusion for films (three's GTAO, which draws the scene once more for its normals). */
export function makeAO(scene, camera) {
    const pass = new GTAOPass(scene, camera, 1, 1);
    pass.output = GTAOPass.OUTPUT.Default;
    return pass;
}
/** Parameters of the occlusion for a reach of `radius` metres. */
export function aoParameters(radius) {
    return { radius, distanceExponent: 1.5, thickness: radius * 0.5, scale: 1, samples: 16 };
}
