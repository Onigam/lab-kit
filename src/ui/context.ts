import type { PartInfo } from '../content';
import type { Stage } from '../three';
import type { LabDefinition, LabSim, SceneDef } from './lab';
import type { Mode, Store } from './state';

// Glue shared by every panel: navigation between worlds/modes and part selection.

// `any` by default so the shell panels accept the context of any lab; a lab types its own panels
// with `AppContext<MySim>`.
export class AppContext<S extends LabSim = any> {
  private byId: Map<string, PartInfo>;

  constructor(
    readonly def: LabDefinition<S>,
    readonly stage: Stage,
    readonly store: Store,
  ) {
    this.byId = new Map(def.parts.map((p) => [p.id, p]));
  }

  get ui() {
    return this.store.state;
  }

  get sim(): S {
    return this.def.sim;
  }

  partInfo(id: string): PartInfo | undefined {
    return this.byId.get(id);
  }

  sceneDef(id: string): SceneDef | undefined {
    return this.def.scenes.find((s) => s.id === id);
  }

  /** Link to the lab's source video at a "mm:ss" timestamp. */
  videoUrl(ts: string): string {
    const [m, s] = ts.split(':').map(Number);
    return `https://www.youtube.com/watch?v=${this.def.video?.id ?? ''}&t=${m * 60 + (s || 0)}s`;
  }

  // ---- lessons progress, remembered in this browser

  private get doneKey(): string {
    return `${this.def.id}:lessons-done`;
  }

  lessonsDone(): Set<string> {
    try {
      return new Set(JSON.parse(localStorage.getItem(this.doneKey) ?? '[]') as string[]);
    } catch {
      return new Set();
    }
  }

  markLessonDone(id: string): void {
    const done = this.lessonsDone();
    done.add(id);
    try {
      localStorage.setItem(this.doneKey, JSON.stringify([...done]));
    } catch {
      /* storage unavailable: progress is just not kept */
    }
  }

  // ---- navigation

  /** Switch to another 3D world (keeps the current mode when it makes sense). */
  gotoScene(scene: string): void {
    if (scene === this.ui.scene) return;
    const { assembly, install } = this.def.guides ?? {};
    const mode: Mode =
      (this.ui.mode === 'assembly' && scene !== assembly?.scene) ||
      (this.ui.mode === 'install' && scene !== install?.scene)
        ? 'explore'
        : this.ui.mode;
    this.store.set({ scene, mode, selected: null, isolate: false, explode: 0 });
  }

  setMode(mode: Mode): void {
    const patch: Partial<typeof this.ui> = { mode, playing: false };
    const guide =
      mode === 'assembly' ? this.def.guides?.assembly : mode === 'install' ? this.def.guides?.install : null;
    if (guide) Object.assign(patch, { scene: guide.scene, step: 0, explode: 0, isolate: false, selected: null });
    this.store.set(patch);
  }

  /** Select a part, switching world if needed, and frame it. */
  selectPart(id: string | null, opts: { frame?: boolean; mode?: Mode } = {}): void {
    if (id) {
      const info = this.partInfo(id);
      if (info && info.scene !== this.ui.scene) this.store.set({ scene: info.scene });
    }
    this.store.set({ selected: id, ...(opts.mode ? { mode: opts.mode } : {}) });
    if (id && opts.frame !== false) {
      // wait a frame so a world switch is applied before measuring
      requestAnimationFrame(() => this.stage.frameParts([id], this.sceneDef(this.ui.scene)?.partPadding ?? 2.4));
    }
  }
}
