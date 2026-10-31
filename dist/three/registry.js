import * as THREE from 'three';
import { GHOST, GHOST_WIRE } from './materials';
export class PartRegistry {
    parts = new Map();
    /**
     * Register `object` as part `id`. Call it after the object has been positioned
     * and after its children parts (if any) were registered, so nested parts keep
     * their own meshes.
     */
    add(id, object, explode = new THREE.Vector3(), custom) {
        if (this.parts.has(id))
            throw new Error(`Duplicate part id ${id}`);
        object.userData.partId = id;
        const meshes = [];
        object.traverse((o) => {
            if (o !== object && o.userData.partId && o.userData.partId !== id)
                return;
            const mesh = o;
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
        });
        return object;
    }
    get(id) {
        return this.parts.get(id);
    }
    ids() {
        return [...this.parts.keys()];
    }
    /** Set the explode factor of one part (0 assembled, 1 exploded). */
    setFactor(id, f) {
        const p = this.parts.get(id);
        if (!p)
            return;
        p.factor = f;
        p.object.position.copy(p.base).addScaledVector(p.explode, f);
        p.custom?.(f);
    }
    /** Same explode factor for every part. */
    setAllFactors(f) {
        for (const id of this.parts.keys())
            this.setFactor(id, f);
    }
    setDisplay(id, display) {
        const p = this.parts.get(id);
        if (!p || p.display === display)
            return;
        p.display = display;
        for (const m of p.meshes) {
            m.visible = display !== 'hidden';
            m.material =
                display === 'ghost' ? GHOST : display === 'wire' ? GHOST_WIRE : m.userData.solidMaterial;
            m.castShadow = display === 'solid' && m.userData.noShadow !== true;
        }
    }
    setAllDisplay(display) {
        for (const id of this.parts.keys())
            this.setDisplay(id, display);
    }
    /** Meshes that can be clicked (visible, solid). */
    pickables() {
        const out = [];
        for (const p of this.parts.values()) {
            if (p.display === 'hidden')
                continue;
            for (const m of p.meshes)
                out.push(m);
        }
        return out;
    }
    /** Find the part id owning an intersected object. */
    partOf(o) {
        while (o) {
            if (o.userData.ownerPart)
                return o.userData.ownerPart;
            if (o.userData.partId)
                return o.userData.partId;
            o = o.parent;
        }
        return undefined;
    }
    /** World-space bounding box of a part (including nested parts). */
    bounds(id) {
        const box = new THREE.Box3();
        const p = this.parts.get(id);
        if (p)
            box.setFromObject(p.object, true);
        return box;
    }
}
