import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { applyWear, contactRing, contactShadow, grassDetail, patchMaterial } from './detail';

/** A material's shader edit, run on a stand-in for three's shader (only the lines the edits look for). */
function compiled(
  mat: THREE.Material,
  fragment = '',
  vertex = '#include <common>\n#include <begin_vertex>\n#include <worldpos_vertex>',
): { vertexShader: string; fragmentShader: string } {
  const shader = {
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {},
  } as unknown as THREE.WebGLProgramParametersWithUniforms;
  mat.onBeforeCompile(shader, null as unknown as THREE.WebGLRenderer);
  return shader;
}

const FRAG =
  '#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <normal_fragment_maps>\n#include <map_fragment>';

describe('contact shadows', () => {
  const texel = (m: THREE.Mesh, i: number, j: number, N: number): number[] => {
    const tex = (m.material as THREE.MeshBasicMaterial).map as THREE.DataTexture;
    const data = tex.image.data as Uint8Array;
    return [...data.slice((j * N + i) * 4, (j * N + i) * 4 + 4)];
  };

  it('darkens nothing inside the footprint nor beyond the falloff', () => {
    const m = contactShadow(1, 1, 0.5);
    expect(texel(m, 64, 64, 128)).toEqual([255, 255, 255, 255]); // the middle of the footprint
    expect(texel(m, 0, 0, 128)).toEqual([255, 255, 255, 255]); // the far corner
  });
  it('rises over two fifths of the falloff, with its warm tint', () => {
    const m = contactShadow(0.0001, 0.0001, 1, 0.45);
    // along the row through the middle: t = |x| / falloff, W ≈ 2
    const at = (t: number) => texel(m, Math.floor((0.5 + t / 2) * 128), 64, 128)[0];
    expect(at(0.1)).toBeGreaterThan(at(0.38));
    expect(at(0.38)).toBeLessThan(at(0.7));
    const [r, g, b] = texel(m, Math.floor((0.5 + 0.4 / 2) * 128), 64, 128);
    expect(r).toBeLessThan(g);
    expect(g).toBeLessThan(b);
  });
  it('is not fogged, is laid by a polygon offset, and is no part: no shadow, no picking', () => {
    for (const m of [contactShadow(1, 1, 0.5), contactRing(1, 0.5)]) {
      const mat = m.material as THREE.MeshBasicMaterial;
      expect(mat.fog).toBe(false);
      expect(mat.polygonOffset).toBe(true);
      expect(mat.blending).toBe(THREE.MultiplyBlending);
      expect(m.userData.noShadow).toBe(true);
      m.raycast(new THREE.Raycaster(), []);
    }
  });
  it('without `fade` the program is the plain one; with it, it goes to white with the distance', () => {
    const plain = contactShadow(1, 1, 0.5).material as THREE.Material;
    expect(plain.customProgramCacheKey()).not.toContain('shadow-fade');
    expect(compiled(plain, FRAG).fragmentShader).toBe(FRAG);
    const faded = contactShadow(1, 1, 0.5, 0.45, { near: 8, far: 12 }).material as THREE.Material;
    expect(faded.customProgramCacheKey()).toContain('shadow-fade-8-12');
    expect(compiled(faded, FRAG).fragmentShader).toContain('smoothstep( 8.000, 12.000, 1.0 / gl_FragCoord.w )');
    const ring = contactRing(1, 0.5, 0.45, { near: 8, far: 12 }).material as THREE.Material;
    expect(ring.customProgramCacheKey()).toContain('shadow-fade-8-12');
  });
});

describe('wear', () => {
  const part = (over: Partial<THREE.MeshStandardMaterialParameters> = {}) => {
    const mat = new THREE.MeshStandardMaterial(over);
    return { mat, mesh: new THREE.Mesh(new THREE.BoxGeometry(), mat) };
  };
  it("varies a metal's roughness by a tenth, a matte material's by 0.12", () => {
    const metal = part({ metalness: 1 });
    const matte = part({ metalness: 0 });
    applyWear(metal.mesh, 60);
    applyWear(matte.mesh, 60);
    expect(compiled(metal.mat, FRAG).fragmentShader).toContain('( 1.0 + 0.1 * dtN )');
    expect(compiled(matte.mat, FRAG).fragmentShader).toContain('( 1.0 + 0.12 * dtN )');
  });
  it('leaves transparent materials, the ones `skip` names and the ones already worn alone', () => {
    const glass = part({ transparent: true });
    applyWear(glass.mesh, 60);
    expect(glass.mat.userData.worn).toBeUndefined();
    const skipped = part();
    applyWear(skipped.mesh, 60, () => true);
    expect(skipped.mat.userData.worn).toBeUndefined();
    const twice = part();
    applyWear(twice.mesh, 60);
    const key = twice.mat.customProgramCacheKey();
    applyWear(twice.mesh, 90);
    expect(twice.mat.customProgramCacheKey()).toBe(key);
  });
  it("reads a material's own tint and amount", () => {
    const own = part();
    own.mat.userData.wear = { tint: [0.9, 0.9, 0.9], amount: 0.2 };
    applyWear(own.mesh, 60);
    const frag = compiled(own.mat, FRAG).fragmentShader;
    expect(frag).toContain('vec3( 0.900, 0.900, 0.900 )');
    expect(frag).toContain('0.200 * ( dtNoise3');
  });
});

describe('the ground', () => {
  it('fades each octave of the bump with its own size, and tight: nothing under 2.5 pixels a cell', () => {
    const mat = new THREE.MeshStandardMaterial();
    grassDetail(mat);
    const frag = compiled(mat, FRAG).fragmentShader;
    expect(frag).toContain('float kA = dtKeep( mpp * 1.6 );');
    expect(frag).toContain('float kB = dtKeep( mpp * 4.3 );');
    expect(frag).toContain('smoothstep( 0.17, 0.4, cellsPerPixel )');
  });
});

describe('patchMaterial', () => {
  it("runs after a material's own edit and gives the program its own key", () => {
    const mat = new THREE.MeshBasicMaterial();
    const order: string[] = [];
    mat.onBeforeCompile = () => void order.push('own');
    patchMaterial(mat, 'one', () => void order.push('one'));
    patchMaterial(mat, 'two', () => void order.push('two'));
    compiled(mat);
    expect(order).toEqual(['own', 'one', 'two']);
    expect(mat.customProgramCacheKey()).toContain('|one|two');
  });
});
