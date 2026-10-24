import { guideDef, guideScenes, stepScene } from './display';
// Glue shared by every panel: navigation between worlds/modes and part selection.
// `any` by default so the shell panels accept the context of any lab; a lab types its own panels
// with `AppContext<MySim>`.
export class AppContext {
    def;
    stage;
    store;
    byId;
    constructor(def, stage, store) {
        this.def = def;
        this.stage = stage;
        this.store = store;
        this.byId = new Map(def.parts.map((p) => [p.id, p]));
    }
    get ui() {
        return this.store.state;
    }
    get sim() {
        return this.def.sim;
    }
    partInfo(id) {
        return this.byId.get(id);
    }
    sceneDef(id) {
        return this.def.scenes.find((s) => s.id === id);
    }
    /** Link to the lab's source video at a "mm:ss" timestamp. */
    videoUrl(ts) {
        const [m, s] = ts.split(':').map(Number);
        return `https://www.youtube.com/watch?v=${this.def.video?.id ?? ''}&t=${m * 60 + (s || 0)}s`;
    }
    // ---- lessons progress, remembered in this browser
    get doneKey() {
        return `${this.def.id}:lessons-done`;
    }
    lessonsDone() {
        try {
            return new Set(JSON.parse(localStorage.getItem(this.doneKey) ?? '[]'));
        }
        catch {
            return new Set();
        }
    }
    markLessonDone(id) {
        const done = this.lessonsDone();
        done.add(id);
        try {
            localStorage.setItem(this.doneKey, JSON.stringify([...done]));
        }
        catch {
            /* storage unavailable: progress is just not kept */
        }
    }
    // ---- navigation
    /** Switch to another 3D world (keeps the current mode when it makes sense). */
    gotoScene(scene) {
        if (scene === this.ui.scene)
            return;
        const guide = guideDef(this.def, this.ui.mode);
        const mode = guide && !guideScenes(guide).has(scene) ? 'explore' : this.ui.mode;
        this.store.set({ scene, mode, selected: null, isolate: false, explode: 0 });
    }
    setMode(mode) {
        const patch = { mode, playing: false };
        const guide = guideDef(this.def, mode);
        if (guide)
            Object.assign(patch, { scene: stepScene(guide, 0), step: 0, explode: 0, isolate: false, selected: null });
        this.store.set(patch);
    }
    /** Select a part, switching world if needed, and frame it. */
    selectPart(id, opts = {}) {
        if (id) {
            const info = this.partInfo(id);
            if (info && info.scene !== this.ui.scene)
                this.store.set({ scene: info.scene });
        }
        this.store.set({ selected: id, ...(opts.mode ? { mode: opts.mode } : {}) });
        if (id && opts.frame !== false) {
            // wait a frame so a world switch is applied before measuring
            requestAnimationFrame(() => this.stage.frameParts([id], this.sceneDef(this.ui.scene)?.partPadding ?? 2.4));
        }
    }
}
