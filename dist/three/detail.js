import * as THREE from 'three';
// Near detail that keeps a view from feeling empty, without adding shimmer (the picture rule, docs/lab-quality.md §3): the ground's patches and
// tufts, wear on the parts and contact shadows on the paper floors. Procedural only (no texture file, no asset). Every pattern drawn in a shader fades
// out before a cell of it gets under a few pixels (its frequency is compared with the screen derivative of its coordinate): it adds detail close up and
// nothing that could crawl from afar.
//
// From the labs' copies, with the fixes of their reviews (Pelton, Piggott, Mill, the sand battery, the mass heater), the numbers as they are: each octave
// of the bump fades with its own size, the fade is the tight one, a metal's roughness varies by a tenth, the shadows are not fogged and have a polygon
// offset, and they rise over two fifths of their falloff. Nothing here runs until a lab calls it. The ram pump's copy still has the older numbers.
/** GLSL: value noise, a 3D blend of it, and the fade of a pattern by its size on screen. */
const NOISE_GLSL = /* glsl */ `
  float dtHash( vec2 p ) { p = fract( p * vec2( 123.34, 456.21 ) ); p += dot( p, p + 45.32 ); return fract( p.x * p.y ); }
  float dtNoise( vec2 p ) {
    vec2 i = floor( p ); vec2 f = fract( p ); vec2 u = f * f * ( 3.0 - 2.0 * f );
    float a = dtHash( i ), b = dtHash( i + vec2( 1.0, 0.0 ) ), c = dtHash( i + vec2( 0.0, 1.0 ) ), d = dtHash( i + vec2( 1.0, 1.0 ) );
    return mix( mix( a, b, u.x ), mix( c, d, u.x ), u.y ) * 2.0 - 1.0;
  }
  float dtNoise3( vec3 p ) { return 0.35 * ( dtNoise( p.xy ) + dtNoise( p.yz + 17.3 ) ) + 0.3 * dtNoise( p.zx - 9.1 ); }
  // 1 while a cell of the pattern spans more than ~6 pixels, 0 once it is under ~2.5 (a pattern of two-pixel cells crawls as the camera moves)
  float dtKeep( float cellsPerPixel ) { return 1.0 - smoothstep( 0.17, 0.4, cellsPerPixel ); }
`;
/** Chain a shader edit after a material's own `onBeforeCompile`, and give the program its own cache key. */
export function patchMaterial(mat, key, edit) {
    const before = mat.onBeforeCompile;
    const keyBefore = mat.customProgramCacheKey.bind(mat);
    mat.onBeforeCompile = (shader, renderer) => {
        before.call(mat, shader, renderer);
        edit(shader);
    };
    mat.customProgramCacheKey = () => `${keyBefore()}|${key}`;
    mat.needsUpdate = true;
}
// ------------------------------------------------------------------------------------------------ ground
/**
 * The grass of the meadow: patches of drier and greener grass tens of metres across, tufts a metre across, and their bump in
 * the light; on top of the ground's vertex colours. Stays put in the world (x, z).
 */
export function grassDetail(mat) {
    patchMaterial(mat, 'grass-detail', (shader) => {
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vDtWorld;')
            .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvDtWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `#include <common>\nvarying vec3 vDtWorld;\n${NOISE_GLSL}`)
            .replace('#include <color_fragment>', 
        /* glsl */ `#include <color_fragment>
        {
          vec2 p = vDtWorld.xz;
          float mpp = max( length( fwidth( p ) ), 1e-4 ); // metres per pixel
          float macro = 0.6 * dtNoise( p * 0.035 ) + 0.4 * dtNoise( p * 0.09 + 7.0 );
          float mid = dtNoise( p * 0.35 ) * dtKeep( mpp * 0.35 );
          float tufts = dtNoise( p * 1.6 ) * dtKeep( mpp * 1.6 ) + 0.5 * dtNoise( p * 4.3 ) * dtKeep( mpp * 4.3 );
          vec3 c = diffuseColor.rgb;
          c = mix( c, c * vec3( 1.10, 1.03, 0.80 ), 0.35 * smoothstep( 0.05, 0.6, macro ) );
          c = mix( c, c * vec3( 0.86, 0.97, 0.86 ), 0.30 * smoothstep( 0.1, 0.7, -macro ) );
          diffuseColor.rgb = c * ( 1.0 + 0.07 * mid + 0.06 * tufts );
        }`)
            .replace('#include <normal_fragment_maps>', 
        /* glsl */ `#include <normal_fragment_maps>
        {
          // each octave of the bump fades with its own size on screen: the 4.3 one is under two pixels long before the 1.6 one is
          vec2 p = vDtWorld.xz;
          float mpp = max( length( fwidth( p ) ), 1e-4 );
          float kA = dtKeep( mpp * 1.6 );
          float kB = dtKeep( mpp * 4.3 );
          if ( kA + kB > 0.001 ) {
            float e = 0.08;
            float h0 = kA * dtNoise( p * 1.6 ) + 0.5 * kB * dtNoise( p * 4.3 );
            float hx = kA * dtNoise( ( p + vec2( e, 0.0 ) ) * 1.6 ) + 0.5 * kB * dtNoise( ( p + vec2( e, 0.0 ) ) * 4.3 );
            float hz = kA * dtNoise( ( p + vec2( 0.0, e ) ) * 1.6 ) + 0.5 * kB * dtNoise( ( p + vec2( 0.0, e ) ) * 4.3 );
            normal = normalize( normal - 0.018 * ( viewMatrix * vec4( ( hx - h0 ) / e, 0.0, ( hz - h0 ) / e, 0.0 ) ).xyz );
          }
        }`);
    });
}
// ------------------------------------------------------------------------------------------------ wear
/**
 * Wear on the solid parts under `root`: a slow variation of colour and roughness, as no made part is one flat colour. In each
 * mesh's own coordinates, so it moves with the part (explode, the rotor's turn). `freq`: cells per metre of the variation (a
 * hillside 3, a bench 60). Transparent materials and the ones `skip` names are left alone. A material may ask for its own wear
 * in `userData.wear`: `tint` (the colour of its stains) and `amount` (1 by default).
 */
export function applyWear(root, freq, skip = () => false) {
    const seen = new Set();
    root.traverse((o) => {
        const m = o;
        if (!m.isMesh || skip(m))
            return;
        for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
            const std = mat;
            if (!std.isMeshStandardMaterial || std.transparent || seen.has(std) || std.userData.worn)
                continue;
            seen.add(std);
            std.userData.worn = true;
            const metal = std.metalness > 0.5;
            const wear = (std.userData.wear ?? {});
            const tint = wear.tint ?? [1.03, 0.99, 0.92];
            const amount = wear.amount ?? 1;
            const tintGlsl = `vec3( ${tint.map((v) => v.toFixed(3)).join(', ')} )`;
            patchMaterial(std, `wear-${freq}-${metal ? 'metal' : 'matte'}-${tint.join('-')}-${amount}`, (shader) => {
                shader.vertexShader = shader.vertexShader
                    .replace('#include <common>', '#include <common>\nvarying vec3 vDtObj;')
                    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDtObj = position;');
                shader.fragmentShader = shader.fragmentShader
                    .replace('#include <common>', `#include <common>\nvarying vec3 vDtObj;\n${NOISE_GLSL}`)
                    .replace('#include <color_fragment>', 
                /* glsl */ `#include <color_fragment>
            vec3 dtP = vDtObj * ${freq.toFixed(3)};
            float dtCpp = length( fwidth( dtP ) );
            float dtN = ${amount.toFixed(3)} * ( dtNoise3( dtP ) * dtKeep( dtCpp ) + 0.5 * dtNoise3( dtP * 3.1 + 5.0 ) * dtKeep( dtCpp * 3.1 ) );
            diffuseColor.rgb *= 1.0 + ${metal ? '0.05' : '0.08'} * dtN;
            diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * ${tintGlsl}, ${metal ? '0.10' : '0.18'} * smoothstep( 0.2, 0.8, dtN ) );`)
                    .replace('#include <roughnessmap_fragment>', 
                /* glsl */ `#include <roughnessmap_fragment>
            roughnessFactor = clamp( roughnessFactor * ( 1.0 + ${metal ? '0.1' : '0.12'} * dtN ), 0.04, 1.0 );`);
            });
        }
    });
}
/** A shadow is unfogged: left alone it keeps its strength while what stands on it sinks into the fog, as a faint dark ring (Mill's review, D12). */
function fadeWithDistance(mat, fade) {
    patchMaterial(mat, `shadow-fade-${fade.near}-${fade.far}`, (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', 
        /* glsl */ `#include <map_fragment>
      // the distance along the view: gl_FragCoord.w is 1 / w, and w is that depth. White multiplies to nothing.
      diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 1.0 ), smoothstep( ${fade.near.toFixed(3)}, ${fade.far.toFixed(3)}, 1.0 / gl_FragCoord.w ) );`);
    });
}
/** The same as `contactShadow` for a round foot: a dark ring around a disc of radius `r`, fading over `falloff`, on a paper floor. */
export function contactRing(r, falloff, strength = 0.45, fade) {
    const N = 256;
    const R = r + falloff;
    const data = new Uint8Array(N * N * 4);
    for (let j = 0; j < N; j++) {
        for (let i = 0; i < N; i++) {
            const d = Math.hypot(((i + 0.5) / N - 0.5) * 2 * R, ((j + 0.5) / N - 0.5) * 2 * R);
            const t = (d - r) / falloff;
            const rise = Math.min(1, Math.max(0, t / 0.25));
            const a = t > 0 ? rise * rise * (3 - 2 * rise) * Math.max(0, 1 - t) ** 1.5 : 0;
            const v = strength * a;
            const k = (j * N + i) * 4;
            data[k] = Math.round(255 * (1 - v));
            data[k + 1] = Math.round(255 * (1 - v * 0.96));
            data[k + 2] = Math.round(255 * (1 - v * 0.9));
            data[k + 3] = 255;
        }
    }
    const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
    const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        blending: THREE.MultiplyBlending,
        premultipliedAlpha: true,
        depthWrite: false,
        toneMapped: false,
        fog: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
    });
    if (fade)
        fadeWithDistance(mat, fade);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2 * R, 2 * R), mat);
    m.rotation.x = -Math.PI / 2;
    m.renderOrder = -1;
    m.name = 'contact-shadow';
    m.userData.noShadow = true;
    m.raycast = () => { };
    return m;
}
/**
 * The darker border on a floor around what stands on it (the ambient light the floor does not get next to a body): a footprint
 * of `w` by `d` metres, centred, fading over `falloff`. Multiplied over the floor. Lay it between the floor and the body's
 * underside: in front of the floor by depth alone, behind the body's foot, so the body always covers it. Inside the footprint
 * it darkens nothing, so a pixel of the body's foot that it might reach is never darkened. Not a part: no shadow, no picking. `fade`: let it go with
 * the distance, for a world with fog.
 */
export function contactShadow(w, d, falloff, strength = 0.45, fade) {
    const N = 128;
    const W = w + 2 * falloff;
    const D = d + 2 * falloff;
    const data = new Uint8Array(N * N * 4);
    for (let j = 0; j < N; j++) {
        for (let i = 0; i < N; i++) {
            const dx = Math.max(0, Math.abs(((i + 0.5) / N - 0.5) * W) - w / 2);
            const dz = Math.max(0, Math.abs(((j + 0.5) / N - 0.5) * D) - d / 2);
            // 0 inside the footprint, rising over the first two fifths of the falloff, then fading: no hard dark line at the body's foot,
            // which would draw a strong edge that crawls as the camera moves
            const t = dx > 0 || dz > 0 ? Math.hypot(dx, dz) / falloff : 0;
            const rise = Math.min(1, t / 0.4);
            const a = t > 0 ? rise * rise * (3 - 2 * rise) * Math.max(0, 1 - t) : 0;
            const v = strength * a;
            const k = (j * N + i) * 4;
            // a warm darkening, as the ink of the shadows (not a grey)
            data[k] = Math.round(255 * (1 - v));
            data[k + 1] = Math.round(255 * (1 - v * 0.96));
            data[k + 2] = Math.round(255 * (1 - v * 0.9));
            data[k + 3] = 255;
        }
    }
    const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
    const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        blending: THREE.MultiplyBlending,
        premultipliedAlpha: true,
        depthWrite: false,
        toneMapped: false,
        // not fogged: a fogged plane is no longer white, and multiplied over the floor it draws a hard-edged patch from afar
        fog: false,
        // a plane a few millimetres over a floor seen from metres away loses the depth test in bands (the 24-bit buffer)
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
    });
    if (fade)
        fadeWithDistance(mat, fade);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mat);
    m.rotation.x = -Math.PI / 2;
    m.renderOrder = -1;
    m.name = 'contact-shadow';
    m.userData.noShadow = true;
    m.raycast = () => { };
    return m;
}
