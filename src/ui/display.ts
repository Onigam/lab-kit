import * as THREE from 'three';
import type { GuideStep } from '../content/types';
import type { Stage } from '../three/core';
import type { PartDisplay } from '../three/registry';
import { damp, ease } from '../three/util';
import type { AnyLab } from './lab';
import type { Store } from './state';

// Decides, every frame, how each part of the active scene is shown: solid, ghost,
// wire or hidden, and how far it is exploded. Handles the animated guide steps.

const STEP_ANIM = 1.4;
const AUTOPLAY = 6;

/** Steps of the guide playing in this mode and world, if any. */
export function guideFor(def: AnyLab, mode: string, scene: string): GuideStep[] | null {
  const g = mode === 'assembly' ? def.guides?.assembly : mode === 'install' ? def.guides?.install : undefined;
  return g && g.scene === scene ? g.steps : null;
}

export class DisplayController {
  private explode = 0;
  private stepKey = '';
  private stepStart = 0;
  private time = 0;

  constructor(
    private def: AnyLab,
    private stage: Stage,
    private store: Store,
  ) {}

  update(dt: number): void {
    this.time += dt;
    const ui = this.store.state;
    const mod = this.stage.active;
    const reg = mod.registry;
    const guide = guideFor(this.def, ui.mode, mod.id);
    let changed = false;
    const show = (id: string, d: PartDisplay) => {
      const before = reg.get(id)?.display;
      if (before !== d) {
        reg.setDisplay(id, d);
        changed = true;
      }
    };

    if (guide) {
      const step = Math.min(ui.step, guide.length - 1);
      const key = `${ui.mode}:${step}`;
      if (key !== this.stepKey) {
        this.stepKey = key;
        this.stepStart = this.time;
        this.onStepChange(guide, step);
      }
      const before = new Set<string>();
      const all = new Set<string>();
      guide.forEach((s, i) => {
        for (const p of s.parts) {
          all.add(p);
          if (i < step) before.add(p);
        }
      });
      const current = new Set(guide[step].parts);
      const k = ease.out(Math.min(1, (this.time - this.stepStart) / STEP_ANIM));
      for (const id of reg.ids()) {
        if (current.has(id)) {
          show(id, 'solid');
          reg.setFactor(id, 1 - k);
        } else if (before.has(id) || !all.has(id)) {
          show(id, 'solid');
          reg.setFactor(id, 0);
        } else {
          show(id, ui.ghost ? 'wire' : 'hidden');
          reg.setFactor(id, 0);
        }
      }
      this.stage.highlight(this.time - this.stepStart < STEP_ANIM + 2.5 ? [...current] : []);
      if (ui.playing && this.time - this.stepStart > AUTOPLAY) {
        if (step < guide.length - 1) this.store.set({ step: step + 1 });
        else this.store.set({ playing: false });
      }
    } else {
      if (this.stepKey) {
        // leaving a guide: drop the step highlight
        this.stepKey = '';
        this.stage.refreshOutline();
      }
      this.explode = damp(this.explode, ui.explode, 6, dt);
      const xrayShell = this.def.scenes.find((sc) => sc.id === mod.id)?.xrayShell;
      for (const id of reg.ids()) {
        reg.setFactor(id, this.explode);
        let d: PartDisplay = 'solid';
        if (ui.isolate && ui.selected) d = id === ui.selected ? 'solid' : 'hidden';
        else if (ui.xray && ui.selected) d = id === ui.selected ? 'solid' : 'ghost';
        else if (ui.xray && xrayShell?.(id)) d = 'ghost';
        show(id, d);
      }
    }
    if (changed) {
      this.stage.refreshLabels();
      if (!guide) this.stage.refreshOutline();
    }
  }

  /** Frame the parts of the new step (at their final position). */
  private onStepChange(guide: GuideStep[], step: number): void {
    if (!this.store.state.autoFrame) return;
    const reg = this.stage.active.registry;
    const ids = guide[step].parts.filter((id) => reg.get(id));
    if (!ids.length) {
      this.stage.home();
      return;
    }
    const saved = ids.map((id) => reg.get(id)!.factor);
    ids.forEach((id) => reg.setFactor(id, 0));
    const box = new THREE.Box3();
    for (const id of ids) box.union(reg.bounds(id));
    ids.forEach((id, i) => reg.setFactor(id, saved[i]));
    // keep some context around small parts (a nut should not fill the screen)
    const frame = this.def.scenes.find((sc) => sc.id === this.stage.active.id)?.stepFrame ?? {
      padding: 1.5,
      minRadius: 0.24,
    };
    this.stage.frameBox(box, frame.padding, 1.1, undefined, frame.minRadius);
  }
}
