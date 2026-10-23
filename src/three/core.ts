import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { tr } from '../i18n';
import type { CameraPose, Hotspot, SceneId, SceneModule } from './types';
import { ease } from './util';

// Shared renderer for the three worlds: one WebGL canvas, one CSS2D label layer,
// an outline pass for hover/selection, orbit controls and camera fly-to animations.

interface Fly {
  fromPos: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toPos: THREE.Vector3;
  toTarget: THREE.Vector3;
  t: number;
  duration: number;
}

interface LabelEntry {
  hotspot: Hotspot;
  object: CSS2DObject;
  el: HTMLButtonElement;
  text: HTMLSpanElement;
}

export interface StageEvents {
  onPick(partId: string | null): void;
  onDoublePick?(partId: string | null): void;
  onHotspot(h: Hotspot): void;
  onHover(partId: string | null): void;
}

export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100);
  readonly controls: OrbitControls;
  private labels: CSS2DRenderer;
  private composer: EffectComposer;
  private renderPass: RenderPass;
  private outline: OutlinePass;
  private outlineHover: OutlinePass;
  private modules = new Map<SceneId, SceneModule>();
  private labelSets = new Map<SceneId, LabelEntry[]>();
  private poses = new Map<SceneId, CameraPose>();
  private env: THREE.Texture;
  private fly: Fly | null = null;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private downAt = new THREE.Vector2();
  private hovered: string | null = null;
  active!: SceneModule;
  /** Label visibility: 'main' hides minor labels, 'all' shows them, 'none' hides every label. */
  labelMode: 'main' | 'all' | 'none' = 'main';
  selected: string | null = null;

  constructor(
    private host: HTMLElement,
    private events: StageEvents,
  ) {
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
    this.outlineHover = new OutlinePass(new THREE.Vector2(1, 1), new THREE.Scene(), this.camera);
    this.outlineHover.edgeStrength = 2.2;
    this.outlineHover.edgeThickness = 1;
    this.outlineHover.visibleEdgeColor.set(0x7cc3e8);
    this.outlineHover.hiddenEdgeColor.set(0x3c6d8c);
    this.composer.addPass(this.outlineHover);
    this.outline = new OutlinePass(new THREE.Vector2(1, 1), new THREE.Scene(), this.camera);
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
      if (this.downAt.distanceTo(new THREE.Vector2(e.clientX, e.clientY)) > 5) return;
      this.events.onPick(this.pick(e));
    });
    el.addEventListener('dblclick', (e) => this.events.onDoublePick?.(this.pick(e as PointerEvent)));
    el.addEventListener('pointermove', (e) => {
      if (e.buttons) return;
      const id = this.pick(e);
      if (id !== this.hovered) {
        this.hovered = id;
        el.style.cursor = id ? 'pointer' : '';
        this.refreshOutline();
        this.events.onHover(id);
      }
    });
    this.controls.addEventListener('start', () => (this.fly = null));

    new ResizeObserver(() => this.resize()).observe(host);
    this.resize();
  }

  register(mod: SceneModule): void {
    this.modules.set(mod.id, mod);
    if (mod.scene.userData.wantsEnv) mod.scene.environment = this.env;
    const entries: LabelEntry[] = [];
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

  get(id: SceneId): SceneModule | undefined {
    return this.modules.get(id);
  }

  setActive(id: SceneId, pose?: CameraPose): void {
    if (this.active) {
      this.poses.set(this.active.id, { position: this.camera.position.clone(), target: this.controls.target.clone() });
      for (const e of this.labelSets.get(this.active.id) ?? []) e.object.visible = false;
    }
    const mod = this.modules.get(id)!;
    this.active = mod;
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
    const p = pose ?? this.poses.get(id)!;
    this.camera.position.copy(p.position);
    this.controls.target.copy(p.target);
    this.fly = null;
    this.selected = null;
    this.hovered = null;
    this.refreshOutline();
    this.refreshLabels();
  }

  /** Smoothly move the camera. */
  flyTo(pose: CameraPose, duration = 0.9): void {
    this.fly = {
      fromPos: this.camera.position.clone(),
      fromTarget: this.controls.target.clone(),
      toPos: pose.position.clone(),
      toTarget: pose.target.clone(),
      t: 0,
      duration,
    };
  }

  /** Frame a world-space box, keeping the current viewing direction (or `dir`). */
  frameBox(box: THREE.Box3, padding = 1.35, duration = 0.9, dir?: THREE.Vector3, minRadius = 0.03): void {
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3());
    const radius = Math.max(minRadius, box.getBoundingSphere(new THREE.Sphere()).radius);
    // fit in the narrower of the vertical and horizontal fields of view
    const vFov = (this.camera.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * this.camera.aspect);
    const fov = Math.min(vFov, hFov);
    const dist = Math.min(
      this.controls.maxDistance,
      Math.max(this.controls.minDistance, (radius * padding) / Math.sin(fov / 2)),
    );
    const d = (dir ?? this.camera.position.clone().sub(this.controls.target)).clone().normalize();
    this.flyTo({ position: center.clone().addScaledVector(d, dist), target: center }, duration);
  }

  /** Overview: frame every visible part of the active world from its home direction. */
  frameAll(duration = 0.9): void {
    const mod = this.active;
    if (mod.id === 'site' || mod.id === 'intake') {
      // landscapes/dioramas are framed by their authored home pose; back off on narrow viewports
      const dir = mod.home.position.clone().sub(mod.home.target);
      const k = Math.max(1, 1.5 / this.camera.aspect);
      // backing off along the home direction would end up among the trees: climb as well
      const pos = mod.home.target.clone().addScaledVector(dir, k);
      pos.y += (k - 1) * dir.length() * 0.7;
      this.flyTo({ position: pos, target: mod.home.target.clone() }, duration);
      return;
    }
    const box = new THREE.Box3();
    for (const p of mod.registry.parts.values()) {
      if (p.display !== 'hidden') box.union(mod.registry.bounds(p.id));
    }
    const dir = mod.home.position.clone().sub(mod.home.target);
    // the bounding sphere over-estimates a long, low machine: tighten a little
    this.frameBox(box, 0.82, duration, dir);
  }

  frameParts(ids: string[], padding = 1.35, dir?: THREE.Vector3): void {
    const box = new THREE.Box3();
    for (const id of ids) box.union(this.active.registry.bounds(id));
    this.frameBox(box, padding, 0.9, dir);
  }

  home(): void {
    this.frameAll();
  }

  setSelection(id: string | null): void {
    this.selected = id;
    this.refreshOutline();
    this.refreshLabels();
  }

  /** Outline a set of parts with the selection colour (guide steps). */
  highlight(ids: string[]): void {
    const objs: THREE.Object3D[] = [];
    for (const id of ids) {
      const p = this.active.registry.get(id);
      if (p && p.display !== 'hidden') objs.push(...p.meshes);
    }
    this.outline.selectedObjects = objs;
  }

  refreshOutline(): void {
    const reg = this.active?.registry;
    if (!reg) return;
    const meshesOf = (id: string | null) => {
      const p = id ? reg.get(id) : undefined;
      return p && p.display !== 'hidden' ? p.meshes : [];
    };
    this.outline.selectedObjects = meshesOf(this.selected);
    this.outlineHover.selectedObjects = this.hovered !== this.selected ? meshesOf(this.hovered) : [];
  }

  refreshLabels(): void {
    for (const [id, entries] of this.labelSets) {
      const isActive = this.active?.id === id;
      for (const e of entries) {
        const part = this.modules.get(id)!.registry.get(e.hotspot.partId);
        const hidden = !part || part.display === 'hidden';
        const minorHidden = e.hotspot.minor && this.labelMode !== 'all' && this.selected !== e.hotspot.partId;
        e.object.visible = isActive && !hidden && this.labelMode !== 'none' && !minorHidden;
        // labels of inactive scenes are not rendered any more: hide their DOM nodes explicitly
        if (!isActive) e.el.parentElement && (e.object.element.style.display = 'none');
        e.text.textContent = tr(e.hotspot.label);
        e.el.classList.toggle('is-selected', this.selected === e.hotspot.partId);
      }
    }
  }

  private pick(e: PointerEvent): string | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.active.registry.pickables(), false);
    for (const h of hits) {
      const mat = (h.object as THREE.Mesh).material as THREE.Material;
      // skip clipped-away halves in cutaway mode
      if (mat.clippingPlanes?.some((pl) => pl.distanceToPoint(h.point) < 0)) continue;
      const id = this.active.registry.partOf(h.object);
      if (id) return id;
    }
    return null;
  }

  private resize(): void {
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.labels.setSize(w, h);
  }

  render(dt: number): void {
    if (this.fly) {
      const f = this.fly;
      f.t = Math.min(1, f.t + dt / f.duration);
      const k = ease.inOut(f.t);
      this.camera.position.lerpVectors(f.fromPos, f.toPos, k);
      this.controls.target.lerpVectors(f.fromTarget, f.toTarget, k);
      if (f.t >= 1) this.fly = null;
    }
    this.controls.update();
    this.composer.render(dt);
    this.labels.render(this.active.scene, this.camera);
  }
}
