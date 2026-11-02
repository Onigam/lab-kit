import * as THREE from 'three';
import { GHOST, GHOST_WIRE } from './materials';

// A PartRegistry knows every selectable part of one scene: where it sits when
// assembled, where it goes in the exploded view, and how it is currently displayed.

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

export class PartRegistry {
  readonly parts = new Map<string, PartEntry>();

  /**
   * Register `object` as part `id`. Call it after the object has been positioned
   * and after its children parts (if any) were registered, so nested parts keep
   * their own meshes.
   */
  add(
    id: string,
    object: THREE.Object3D,
    explode = new THREE.Vector3(),
    custom?: (f: number) => void,
    framing?: PartFraming,
  ): THREE.Object3D {
    if (this.parts.has(id)) throw new Error(`Duplicate part id ${id}`);
    object.userData.partId = id;
    const meshes: THREE.Mesh[] = [];
    object.traverse((o) => {
      if (o !== object && o.userData.partId && o.userData.partId !== id) return;
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh && mesh.userData.ownerPart === undefined) {
        mesh.userData.ownerPart = id;
        mesh.userData.solidMaterial = mesh.material;
        meshes.push(mesh);
      }
    });
    this.parts.set(id, {
      id,
      object,
      base: object.position.clone(),
      explode: explode.clone(),
      factor: 0,
      meshes,
      display: 'solid',
      custom,
      frame: framing?.frame?.clone(),
      viewDir: framing?.viewDir?.clone(),
    });
    return object;
  }

  get(id: string): PartEntry | undefined {
    return this.parts.get(id);
  }

  ids(): string[] {
    return [...this.parts.keys()];
  }

  /** Set the explode factor of one part (0 assembled, 1 exploded). */
  setFactor(id: string, f: number): void {
    const p = this.parts.get(id);
    if (!p) return;
    p.factor = f;
    p.object.position.copy(p.base).addScaledVector(p.explode, f);
    p.custom?.(f);
  }

  /** Same explode factor for every part. */
  setAllFactors(f: number): void {
    for (const id of this.parts.keys()) this.setFactor(id, f);
  }

  setDisplay(id: string, display: PartDisplay): void {
    const p = this.parts.get(id);
    if (!p || p.display === display) return;
    p.display = display;
    for (const m of p.meshes) {
      m.visible = display !== 'hidden';
      m.material =
        display === 'ghost' ? GHOST : display === 'wire' ? GHOST_WIRE : (m.userData.solidMaterial as THREE.Material);
      m.castShadow = display === 'solid' && m.userData.noShadow !== true;
    }
  }

  setAllDisplay(display: PartDisplay): void {
    for (const id of this.parts.keys()) this.setDisplay(id, display);
  }

  /** Meshes that can be clicked (visible, solid). */
  pickables(): THREE.Object3D[] {
    const out: THREE.Object3D[] = [];
    for (const p of this.parts.values()) {
      if (p.display === 'hidden') continue;
      for (const m of p.meshes) out.push(m);
    }
    return out;
  }

  /** Find the part id owning an intersected object. */
  partOf(o: THREE.Object3D | null): string | undefined {
    while (o) {
      if (o.userData.ownerPart) return o.userData.ownerPart as string;
      if (o.userData.partId) return o.userData.partId as string;
      o = o.parent;
    }
    return undefined;
  }

  /** World-space bounding box of a part (including nested parts). */
  bounds(id: string): THREE.Box3 {
    const box = new THREE.Box3();
    const p = this.parts.get(id);
    if (p) box.setFromObject(p.object, true);
    return box;
  }

  /** What `Stage.frameParts` frames for a part: its `frame`, moved with its explode, or its whole box (`bounds`). */
  frameBounds(id: string): THREE.Box3 {
    const p = this.parts.get(id);
    if (!p?.frame) return this.bounds(id);
    for (const other of this.parts.values()) {
      if (other !== p && (other.display === 'hidden' || other.display === 'wire')) return this.bounds(id);
    }
    const moved = p.object.position.clone().sub(p.base);
    if (p.object.parent) {
      p.object.parent.updateWorldMatrix(true, false);
      moved.applyMatrix3(new THREE.Matrix3().setFromMatrix4(p.object.parent.matrixWorld));
    }
    return p.frame.clone().translate(moved);
  }
}
