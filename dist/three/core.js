import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { tr } from '../i18n';
import { GHOST, GHOST_WIRE } from './materials';
import { clamp, damp, ease, lerp } from './util';
/** Pixels the pointer may move after going down and still be a click (no rotation starts). */
const CLICK_SLOP = 3;
const _q1 = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
/** Outline pass that does not redraw the shadow maps for its own depth pass (the main pass just drew them). */
class QuietOutlinePass extends OutlinePass {
    render(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
        const shadows = renderer.shadowMap;
        const auto = shadows.autoUpdate;
        shadows.autoUpdate = false;
        try {
            super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
        }
        finally {
            shadows.autoUpdate = auto;
        }
    }
}
/** Below this aspect ratio of the free view, the overview fits the real extents of the subject, not its sphere. */
const NARROW_FULL = 0.7;
/** Margin of that fit (1 = the subject touches the edge of the free view). */
const TIGHT_PADDING = 1.1;
export class Stage {
    host;
    events;
    renderer;
    camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100);
    controls;
    labels;
    composer;
    renderPass;
    outline;
    outlineHover;
    modules = new Map();
    labelSets = new Map();
    poses = new Map();
    env;
    factories = new Map();
    fly = null;
    size = { w: 0, h: 0 };
    /**
     * Covered part of the view: what the interface says covers it (`insets`), the room kept at the bottom of a narrow view
     * for the floating toolbar (`narrowBottom`), and what is applied now (`insetsNow`, eased towards their sum).
     */
    insets = { top: 0, right: 0, bottom: 0, left: 0 };
    narrowBottom = 0;
    insetsNow = { top: 0, right: 0, bottom: 0, left: 0 };
    lastFraming = null;
    reframeTimer = 0;
    warmed = new Set();
    /** A point set by `setPivot`: the rotation turns around it when a press hits no part. */
    pivot = null;
    grab = null;
    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();
    downAt = new THREE.Vector2();
    hovered = null;
    active;
    /** Label visibility: 'main' hides minor labels, 'all' shows them, 'none' hides every label. */
    labelMode = 'main';
    selected = null;
    /** Explode factor the interface is heading to: the overview frames the device as it will be, not as it is now. */
    explodeTarget = 0;
    constructor(host, events) {
        this.host = host;
        this.events = events;
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1;
        this.renderer.localClippingEnabled = true;
        host.appendChild(this.renderer.domElement);
        this.labels = new CSS2DRenderer();
        this.labels.domElement.className = 'label-layer';
        host.appendChild(this.labels.domElement);
        const pmrem = new THREE.PMREMGenerator(this.renderer);
        this.env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.screenSpacePanning = true;
        this.composer = new EffectComposer(this.renderer);
        this.renderPass = new RenderPass(new THREE.Scene(), this.camera);
        this.composer.addPass(this.renderPass);
        this.outlineHover = new QuietOutlinePass(new THREE.Vector2(1, 1), new THREE.Scene(), this.camera);
        this.outlineHover.edgeStrength = 2.2;
        this.outlineHover.edgeThickness = 1;
        this.outlineHover.visibleEdgeColor.set(0x7cc3e8);
        this.outlineHover.hiddenEdgeColor.set(0x3c6d8c);
        this.composer.addPass(this.outlineHover);
        this.outline = new QuietOutlinePass(new THREE.Vector2(1, 1), new THREE.Scene(), this.camera);
        this.outline.edgeStrength = 4;
        this.outline.edgeThickness = 1.4;
        this.outline.edgeGlow = 0.4;
        this.outline.pulsePeriod = 2.4;
        this.outline.visibleEdgeColor.set(0xff8a2a);
        this.outline.hiddenEdgeColor.set(0xb85f1d);
        this.composer.addPass(this.outline);
        this.composer.addPass(new OutputPass());
        const el = this.renderer.domElement;
        el.addEventListener('pointerdown', (e) => this.downAt.set(e.clientX, e.clientY));
        el.addEventListener('pointerup', (e) => {
            if (this.downAt.distanceTo(new THREE.Vector2(e.clientX, e.clientY)) > 5)
                return;
            this.events.onPick(this.pick(e));
        });
        el.addEventListener('dblclick', (e) => this.events.onDoublePick?.(this.pick(e)));
        el.addEventListener('pointermove', (e) => {
            if (e.buttons)
                return;
            const id = this.pick(e);
            if (id !== this.hovered) {
                this.hovered = id;
                el.style.cursor = id ? 'pointer' : '';
                this.refreshOutline();
                this.events.onHover(id);
            }
        });
        // the wheel and the pinch zoom towards the pointer; a drag that starts on a part turns the camera around that point
        this.controls.zoomToCursor = true;
        host.addEventListener('pointerdown', (e) => this.beginGrab(e), true);
        window.addEventListener('pointermove', (e) => this.moveGrab(e));
        window.addEventListener('pointerup', (e) => this.releaseGrab(e));
        window.addEventListener('pointercancel', (e) => this.releaseGrab(e));
        // the visitor takes the camera: the last framing is no longer replayed on resize
        this.controls.addEventListener('start', () => {
            this.fly = null;
            this.lastFraming = null;
        });
        new ResizeObserver(() => this.resize()).observe(host);
        this.resize();
    }
    register(mod) {
        this.modules.set(mod.id, mod);
        if (mod.scene.userData.wantsEnv)
            mod.scene.environment = this.env;
        const entries = [];
        for (const h of mod.hotspots) {
            const el = document.createElement('button');
            el.className = 'hotspot' + (h.goto ? ' hotspot--goto' : '');
            el.type = 'button';
            const dot = document.createElement('span');
            dot.className = 'hotspot__dot';
            const text = document.createElement('span');
            text.className = 'hotspot__text';
            el.append(dot, text);
            el.addEventListener('click', (ev) => {
                ev.stopPropagation();
                this.events.onHotspot(h);
            });
            el.addEventListener('pointerenter', () => {
                this.hovered = h.partId;
                this.refreshOutline();
            });
            el.addEventListener('pointerleave', () => {
                this.hovered = null;
                this.refreshOutline();
            });
            const obj = new CSS2DObject(el);
            obj.center.set(0, 0.5);
            h.anchor.add(obj);
            entries.push({ hotspot: h, object: obj, el, text });
        }
        this.labelSets.set(mod.id, entries);
        this.poses.set(mod.id, { position: mod.home.position.clone(), target: mod.home.target.clone() });
        this.refreshLabels();
    }
    /** Declare a world that is built on its first visit (`SceneDef.module` as a factory). */
    defineScene(id, make) {
        this.factories.set(id, make);
    }
    /** The world `id`, built now if it was declared with a factory and nobody has visited it yet. */
    get(id) {
        let mod = this.modules.get(id);
        const make = this.factories.get(id);
        if (!mod && make) {
            this.factories.delete(id);
            mod = make();
            this.register(mod);
        }
        return mod;
    }
    setActive(id, pose) {
        if (this.active) {
            this.poses.set(this.active.id, { position: this.camera.position.clone(), target: this.controls.target.clone() });
            for (const e of this.labelSets.get(this.active.id) ?? [])
                e.object.visible = false;
        }
        const mod = this.get(id);
        this.active = mod;
        this.lastFraming = null;
        this.pivot = null;
        this.endGrab();
        this.renderPass.scene = mod.scene;
        this.outline.renderScene = mod.scene;
        this.outlineHover.renderScene = mod.scene;
        const site = id === 'site';
        this.camera.near = site ? 0.1 : 0.01;
        this.camera.far = site ? 4000 : 60;
        this.camera.updateProjectionMatrix();
        this.controls.minDistance = mod.minDistance;
        this.controls.maxDistance = mod.maxDistance;
        this.controls.maxPolarAngle = site ? Math.PI * 0.48 : Math.PI * 0.53;
        const p = pose ?? this.poses.get(id);
        this.camera.position.copy(p.position);
        this.controls.target.copy(p.target);
        this.fly = null;
        this.selected = null;
        this.hovered = null;
        this.refreshOutline();
        this.refreshLabels();
    }
    /** Smoothly move the camera to an authored pose. */
    flyTo(pose, duration = 0.9) {
        this.lastFraming = null;
        this.startFly(pose, duration);
    }
    startFly(pose, duration) {
        // a framing turns the camera around its own target again
        this.pivot = null;
        this.endGrab();
        this.fly = {
            fromPos: this.camera.position.clone(),
            fromTarget: this.controls.target.clone(),
            toPos: pose.position.clone(),
            toTarget: pose.target.clone(),
            t: 0,
            duration,
        };
    }
    // ------------------------------------------------------------ the part of the view the interface leaves free
    /** Tell the stage how much of the view the interface covers; the subject is framed in the rest. */
    setViewInsets(next, animate = true) {
        const before = this.targetInsets();
        this.insets = { ...this.insets, ...next };
        this.insetsChanged(before, animate);
    }
    /**
     * Room to keep at the bottom of a narrow view (a tablet, a narrow window) for the toolbar that floats over it. A wide
     * view keeps the whole picture, as every lab has tuned it; a narrow one is filled by the subject, so the toolbar would
     * cover its foot: the room grows from nothing at an aspect ratio of 1 to all of it at 0.7.
     */
    setNarrowClearance(bottom, animate = true) {
        const before = this.targetInsets();
        this.narrowBottom = bottom;
        this.insetsChanged(before, animate);
    }
    insetsChanged(before, animate) {
        const after = this.targetInsets();
        if (['top', 'right', 'bottom', 'left'].every((k) => Math.abs(after[k] - before[k]) < 0.5))
            return;
        if (!animate) {
            this.insetsNow = { ...this.targetInsets() };
            this.applyView();
        }
        // the picture shifts with the free area; a framing made by the stage is made again to fit it
        this.reframe(0.6);
    }
    /** How narrow the view is: 0 at an aspect ratio of 1 or more, 1 at 0.7 or less. */
    narrowness() {
        if (!this.size.h)
            return 0;
        return clamp((1 - this.size.w / this.size.h) / (1 - NARROW_FULL), 0, 1);
    }
    /** Where the covered part of the view is heading: the interface's insets plus the room for the toolbar of a narrow view. */
    targetInsets() {
        const i = this.insets;
        return { ...i, bottom: i.bottom + this.narrowBottom * this.narrowness() };
    }
    get hasInsets() {
        const i = this.targetInsets();
        return i.top > 0 || i.right > 0 || i.bottom > 0 || i.left > 0;
    }
    /** The free part of the view, in CSS pixels. */
    freeSize() {
        const i = this.targetInsets();
        return {
            w: Math.max(40, this.size.w - i.left - i.right),
            h: Math.max(40, this.size.h - i.top - i.bottom),
        };
    }
    /** Field of view that must hold the subject: the narrower of the free view's two directions. */
    fitFov() {
        const vFov = (this.camera.fov * Math.PI) / 180;
        if (!this.hasInsets || !this.size.h) {
            const hFov = 2 * Math.atan(Math.tan(vFov / 2) * this.camera.aspect);
            return Math.min(vFov, hFov);
        }
        const free = this.freeSize();
        const half = Math.tan(vFov / 2);
        return 2 * Math.atan(Math.min((half * free.h) / this.size.h, (half * free.w) / this.size.h));
    }
    /** Camera aspect, projection centre (the middle of the free view) and projection matrix. */
    applyView() {
        const { w, h } = this.size;
        if (!w || !h)
            return;
        this.camera.aspect = w / h;
        const i = this.insetsNow;
        const ox = w / 2 - (i.left + (w - i.right)) / 2;
        const oy = h / 2 - (i.top + (h - i.bottom)) / 2;
        if (Math.abs(ox) < 0.01 && Math.abs(oy) < 0.01)
            this.camera.clearViewOffset();
        else
            this.camera.setViewOffset(w, h, ox, oy, w, h);
        this.camera.updateProjectionMatrix();
    }
    stepInsets(dt) {
        const a = this.insetsNow;
        const b = this.targetInsets();
        let moving = false;
        for (const k of ['top', 'right', 'bottom', 'left']) {
            if (a[k] === b[k])
                continue;
            a[k] = Math.abs(a[k] - b[k]) < 0.25 ? b[k] : damp(a[k], b[k], 14, dt);
            moving = true;
        }
        if (moving)
            this.applyView();
    }
    /** Play the last framing again (after a resize or a change of the free area) unless the visitor took the camera. */
    reframe(duration = 0.5) {
        this.lastFraming?.run(duration);
    }
    /** The overview follows the explode slider: frame the device again once the visitor stops moving it. */
    refitOverview() {
        if (this.lastFraming?.kind === 'all')
            this.frameAll(0.7);
    }
    /**
     * Distance at which `box`, seen along `d`, fills the free view with `padding` to spare: its real extents are projected
     * (a tall, narrow device in a tall, narrow view is not a sphere).
     */
    extentsDistance(box, d, padding) {
        const center = box.getCenter(new THREE.Vector3());
        const right = new THREE.Vector3().crossVectors(this.camera.up, d);
        if (right.lengthSq() < 1e-6)
            right.set(1, 0, 0);
        right.normalize();
        const up = new THREE.Vector3().crossVectors(d, right).normalize();
        const free = this.freeSize();
        const half = Math.tan((this.camera.fov * Math.PI) / 360);
        const tanH = (half * free.w) / this.size.h;
        const tanV = (half * free.h) / this.size.h;
        const rel = new THREE.Vector3();
        let dist = 0;
        for (const x of [box.min.x, box.max.x]) {
            for (const y of [box.min.y, box.max.y]) {
                for (const z of [box.min.z, box.max.z]) {
                    rel.set(x, y, z).sub(center);
                    const need = Math.max((Math.abs(rel.dot(right)) * padding) / tanH, (Math.abs(rel.dot(up)) * padding) / tanV);
                    dist = Math.max(dist, need + rel.dot(d)); // a corner nearer the camera needs more room
                }
            }
        }
        return dist;
    }
    fitBox(box, padding, duration, dir, minRadius, tight) {
        if (box.isEmpty())
            return;
        const center = box.getCenter(new THREE.Vector3());
        const radius = Math.max(minRadius, box.getBoundingSphere(new THREE.Sphere()).radius);
        // fit in the narrower of the vertical and horizontal fields of view of the free part of the view
        const fov = this.fitFov();
        let dist = (radius * padding) / Math.sin(fov / 2);
        const d = (dir ?? this.camera.position.clone().sub(this.controls.target)).clone().normalize();
        if (tight && this.size.h) {
            // a wide view keeps the sphere fit (and the lab's padding); a narrow one, or one with a sheet over it, fits the extents
            const covered = ['top', 'right', 'bottom', 'left'].some((k) => this.insets[k] > 0);
            const weight = covered ? 1 : this.narrowness();
            if (weight > 0)
                dist = lerp(dist, this.extentsDistance(box, d, TIGHT_PADDING), weight);
        }
        dist = Math.min(this.controls.maxDistance, Math.max(this.controls.minDistance, dist));
        this.startFly({ position: center.clone().addScaledVector(d, dist), target: center }, duration);
    }
    /** Frame a world-space box, keeping the current viewing direction (or `dir`), in the part of the view left free. */
    frameBox(box, padding = 1.35, duration = 0.9, dir, minRadius = 0.03) {
        if (box.isEmpty())
            return;
        this.lastFraming = { kind: 'box', run: (d) => this.fitBox(box, padding, d, dir, minRadius, false) };
        this.fitBox(box, padding, duration, dir, minRadius, false);
    }
    /** Overview: frame every visible part of the active world from its home direction. */
    frameAll(duration = 0.9) {
        const mod = this.active;
        this.lastFraming = { kind: 'all', run: (d) => this.frameAll(d) };
        if (mod.id === 'site' || mod.id === 'intake') {
            // landscapes/dioramas are framed by their authored home pose; back off on narrow viewports
            const dir = mod.home.position.clone().sub(mod.home.target);
            let k = Math.max(1, 1.5 / this.camera.aspect);
            if (this.hasInsets) {
                const free = this.freeSize();
                k = Math.max(1, (1.5 * this.size.h) / free.w, this.size.h / free.h);
            }
            // backing off along the home direction would end up among the trees: climb as well
            const pos = mod.home.target.clone().addScaledVector(dir, k);
            pos.y += (k - 1) * dir.length() * 0.7;
            this.startFly({ position: pos, target: mod.home.target.clone() }, duration);
            return;
        }
        const reg = mod.registry;
        // the device as it will be once the explode slider has arrived
        const exploded = [];
        if (this.explodeTarget > 0) {
            for (const p of reg.parts.values()) {
                if (p.display === 'hidden' || p.factor === this.explodeTarget)
                    continue;
                exploded.push([p.id, p.factor]);
                reg.setFactor(p.id, this.explodeTarget);
            }
        }
        const box = new THREE.Box3();
        for (const p of reg.parts.values()) {
            if (p.display !== 'hidden')
                box.union(reg.bounds(p.id));
        }
        for (const [id, f] of exploded)
            reg.setFactor(id, f);
        const dir = mod.home.position.clone().sub(mod.home.target);
        // the bounding sphere over-estimates a long, low machine: tighten a little
        this.fitBox(box, mod.homePadding ?? 0.82, duration, dir, 0.03, true);
    }
    frameParts(ids, padding = 1.35, dir) {
        const box = new THREE.Box3();
        for (const id of ids)
            box.union(this.active.registry.bounds(id));
        this.frameBox(box, padding, 0.9, dir);
    }
    home() {
        this.frameAll();
    }
    // ------------------------------------------------------------ shaders ahead of use
    /**
     * The steps that compile the shaders of a world ahead of use: the world as it is, the transparent and wire materials of
     * X-ray, isolate and guide previews (on no mesh until used), the section tool (`variant` switches it on and returns what
     * undoes it) and the outline. The caller runs them one at a time while the machine is idle, so the first X-ray,
     * selection or section does not stall a frame. Empty once the world has been warmed.
     */
    warmSteps(id, variant) {
        const mod = this.get(id);
        if (!mod || this.warmed.has(id))
            return [];
        this.warmed.add(id);
        const compile = () => void this.renderer.compile(mod.scene, this.camera);
        const steps = [compile];
        steps.push(() => {
            const probe = new THREE.Mesh(new THREE.BoxGeometry(0.001, 0.001, 0.001), GHOST);
            mod.scene.add(probe);
            try {
                compile();
                probe.material = GHOST_WIRE;
                compile();
            }
            finally {
                mod.scene.remove(probe);
                probe.geometry.dispose();
            }
        });
        if (variant) {
            steps.push(() => {
                const undo = variant();
                try {
                    compile();
                    this.drawScratch(mod); // the shadow shaders are made when the shadows are drawn, not by `compile`
                }
                finally {
                    undo();
                }
            });
        }
        steps.push(() => {
            if (this.active === mod)
                this.warmOutline();
        });
        return steps;
    }
    /** Draw the world once into a one-pixel target: the shaders it needs (shadows included) exist before the first real frame. */
    drawScratch(mod) {
        const previous = this.renderer.getRenderTarget();
        const scratch = new THREE.WebGLRenderTarget(1, 1);
        try {
            this.renderer.setRenderTarget(scratch);
            this.renderer.render(mod.scene, this.camera);
        }
        finally {
            this.renderer.setRenderTarget(previous);
            scratch.dispose();
        }
    }
    /** Run the outline passes once on a scratch target: their depth and mask shaders are compiled before the first use. */
    warmOutline() {
        const part = [...this.active.registry.parts.values()].find((p) => p.display !== 'hidden' && p.meshes.length);
        if (!part)
            return;
        const pass = this.outline;
        const kept = pass.selectedObjects;
        const previous = this.renderer.getRenderTarget();
        const scratch = new THREE.WebGLRenderTarget(1, 1);
        try {
            pass.selectedObjects = [part.meshes[0]];
            pass.render(this.renderer, scratch, scratch, 0, false);
        }
        finally {
            pass.selectedObjects = kept;
            this.renderer.setRenderTarget(previous);
            scratch.dispose();
        }
    }
    setSelection(id) {
        this.selected = id;
        this.refreshOutline();
        this.refreshLabels();
    }
    /** Outline a set of parts with the selection colour (guide steps). */
    highlight(ids) {
        const objs = [];
        for (const id of ids) {
            const p = this.active.registry.get(id);
            if (p && p.display !== 'hidden')
                objs.push(...p.meshes);
        }
        this.outline.selectedObjects = objs;
    }
    refreshOutline() {
        const reg = this.active?.registry;
        if (!reg)
            return;
        const meshesOf = (id) => {
            const p = id ? reg.get(id) : undefined;
            return p && p.display !== 'hidden' ? p.meshes : [];
        };
        this.outline.selectedObjects = meshesOf(this.selected);
        this.outlineHover.selectedObjects = this.hovered !== this.selected ? meshesOf(this.hovered) : [];
    }
    refreshLabels() {
        for (const [id, entries] of this.labelSets) {
            const isActive = this.active?.id === id;
            for (const e of entries) {
                const part = this.modules.get(id).registry.get(e.hotspot.partId);
                const hidden = !part || part.display === 'hidden';
                const minorHidden = e.hotspot.minor && this.labelMode !== 'all' && this.selected !== e.hotspot.partId;
                e.object.visible = isActive && !hidden && this.labelMode !== 'none' && !minorHidden;
                // labels of inactive scenes are not rendered any more: hide their DOM nodes explicitly
                if (!isActive)
                    e.el.parentElement && (e.object.element.style.display = 'none');
                e.text.textContent = tr(e.hotspot.label);
                e.el.classList.toggle('is-selected', this.selected === e.hotspot.partId);
            }
        }
    }
    /** The parts under the pointer, nearest first (the clipped-away half of a part in section mode is skipped). */
    cast(e) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const reg = this.active.registry;
        const out = [];
        for (const h of this.raycaster.intersectObjects(reg.pickables(), false)) {
            const mat = h.object.material;
            // skip clipped-away halves in cutaway mode
            if (mat.clippingPlanes?.some((pl) => pl.distanceToPoint(h.point) < 0))
                continue;
            const id = reg.partOf(h.object);
            if (id)
                out.push({ id, point: h.point });
        }
        return out;
    }
    pick(e) {
        return this.cast(e)[0]?.id ?? null;
    }
    // ------------------------------------------------------------ turning around what you grab
    /**
     * Where the next rotation of the camera turns when a press hits no part (default: the point the camera looks at, which is
     * what OrbitControls does). Any framing (`frameAll`, `frameBox`, `frameParts`, `flyTo`) and any change of world sets it back
     * to the target of the camera. `null` clears it.
     */
    setPivot(point) {
        this.pivot = point ? point.clone() : null;
    }
    /**
     * A press with the main button (or one finger) on a solid part: the camera will turn around the point that was pressed, so
     * the part stays under the pointer instead of sweeping across the view as it does when the camera turns around a distant
     * target. OrbitControls does not rotate for this gesture (`enableRotate` is off until it ends); it still pans, zooms and
     * pinches. A press on nothing, or with a modifier key, is left to OrbitControls, around the target of the camera.
     */
    beginGrab(e) {
        if (this.grab && !this.grab.released && e.pointerId !== this.grab.id && e.pointerType !== 'mouse') {
            // a second finger: a pinch or a two-finger pan, which OrbitControls handles
            this.grab = null;
            this.controls.enableRotate = true;
            return;
        }
        if (e.target !== this.renderer.domElement)
            return;
        if (e.pointerType === 'mouse' ? e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey : !e.isPrimary)
            return;
        const reg = this.active.registry;
        // the first solid part under the pointer (a transparent one in front does not take the grab)
        const hit = this.cast(e).find((h) => reg.get(h.id)?.display === 'solid');
        const pivot = hit?.point ?? this.pivot;
        if (!pivot)
            return;
        this.grab = {
            id: e.pointerId,
            pivot: pivot.clone(),
            startX: e.clientX,
            startY: e.clientY,
            x: e.clientX,
            y: e.clientY,
            moved: false,
            released: false,
            yaw: 0,
            pitch: 0,
        };
        this.controls.enableRotate = false;
        // like any press on the view: a flight stops and the last framing is no longer replayed on resize
        this.fly = null;
        this.lastFraming = null;
    }
    moveGrab(e) {
        const g = this.grab;
        if (!g || g.released || e.pointerId !== g.id)
            return;
        if (!g.moved) {
            if (Math.hypot(e.clientX - g.startX, e.clientY - g.startY) <= CLICK_SLOP)
                return; // still a click
            g.moved = true;
        }
        // the same angles as OrbitControls: a drag of the height of the view is a full turn
        const k = (2 * Math.PI * this.controls.rotateSpeed) / this.renderer.domElement.clientHeight;
        g.yaw -= k * (e.clientX - g.x);
        g.pitch -= k * (e.clientY - g.y);
        g.x = e.clientX;
        g.y = e.clientY;
        this.stepGrab();
    }
    releaseGrab(e) {
        const g = this.grab;
        if (!g || g.released || e.pointerId !== g.id)
            return;
        g.released = true;
        this.controls.enableRotate = true;
        if (!g.moved)
            this.grab = null;
    }
    /** Stop a grab at once (a flight starts, the world changes). */
    endGrab() {
        if (!this.grab)
            return;
        this.grab = null;
        this.controls.enableRotate = true;
    }
    /** Apply a share of the angles still to turn, as OrbitControls does with its damping (once per frame and per move). */
    stepGrab() {
        const g = this.grab;
        if (!g)
            return;
        const k = this.controls.enableDamping ? this.controls.dampingFactor : 1;
        const yaw = g.yaw * k;
        const pitch = g.pitch * k;
        g.yaw -= yaw;
        g.pitch -= pitch;
        if (yaw !== 0 || pitch !== 0)
            this.rotateAbout(g.pivot, yaw, pitch);
        if (g.released && Math.abs(g.yaw) + Math.abs(g.pitch) < 1e-5)
            this.grab = null;
    }
    /**
     * Turn the camera around `p` as one rigid body: `yaw` about the world up axis, then `pitch` about its own right axis, the
     * polar angle kept between the limits of the controls. `p` stays exactly where it is on the screen. The target of the controls
     * goes on the line of sight at the distance of `p`, so that its zoom and pan state stay coherent with the new view.
     */
    rotateAbout(p, yaw, pitch) {
        const cam = this.camera;
        _q1.setFromAxisAngle(cam.up, yaw);
        const pos = _v.copy(cam.position).sub(p).applyQuaternion(_q1);
        const orientation = _q2.copy(cam.quaternion).premultiply(_q1);
        // the polar angle of the camera, seen from the point it looks at: 90 degrees above the horizon it looks along
        const forward = _w.set(0, 0, -1).applyQuaternion(orientation);
        const phi = Math.PI / 2 + Math.asin(Math.max(-1, Math.min(1, forward.dot(cam.up))));
        const EPS = 1e-6;
        const lo = Math.max(EPS, this.controls.minPolarAngle);
        const hi = Math.min(Math.PI - EPS, this.controls.maxPolarAngle);
        const alpha = Math.max(lo, Math.min(hi, phi + pitch)) - phi;
        const right = _w.set(1, 0, 0).applyQuaternion(orientation);
        _q1.setFromAxisAngle(right, alpha);
        pos.applyQuaternion(_q1);
        orientation.premultiply(_q1).normalize();
        cam.position.copy(p).add(pos);
        cam.quaternion.copy(orientation);
        cam.updateMatrixWorld();
        const dist = Math.max(this.controls.minDistance, Math.min(this.controls.maxDistance, cam.position.distanceTo(p)));
        this.controls.target.copy(cam.position).addScaledVector(_w.set(0, 0, -1).applyQuaternion(orientation), dist);
    }
    resize() {
        const w = this.host.clientWidth;
        const h = this.host.clientHeight;
        if (!w || !h)
            return;
        const changed = Math.abs(w - this.size.w) > 1 || Math.abs(h - this.size.h) > 1;
        this.size = { w, h };
        this.applyView();
        this.renderer.setSize(w, h);
        this.composer.setSize(w, h);
        this.labels.setSize(w, h);
        if (changed && this.lastFraming) {
            // a window resize or a rotation: frame the subject again once the layout has settled
            window.clearTimeout(this.reframeTimer);
            this.reframeTimer = window.setTimeout(() => this.reframe(0.5), 140);
        }
    }
    render(dt) {
        this.stepInsets(dt);
        if (this.fly) {
            const f = this.fly;
            f.t = Math.min(1, f.t + dt / f.duration);
            const k = ease.inOut(f.t);
            this.camera.position.lerpVectors(f.fromPos, f.toPos, k);
            this.controls.target.lerpVectors(f.fromTarget, f.toTarget, k);
            if (f.t >= 1)
                this.fly = null;
        }
        this.stepGrab();
        this.controls.update();
        this.composer.render(dt);
        this.labels.render(this.active.scene, this.camera);
    }
}
