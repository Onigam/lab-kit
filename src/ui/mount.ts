import { configureI18n } from '../i18n';
import { Stage, type ViewOpts } from '../three';
import { App } from './app';
import type { AppContext } from './context';
import { DisplayController } from './display';
import type { LabDefinition, LabSim } from './lab';
import { createStore, type Store } from './state';

export interface MountOptions {
  /** Root element of the application grid (`#app`). */
  app: HTMLElement;
  /** Element the 3D canvas lives in (`#viewport`, a child of `app`). */
  viewport: HTMLElement;
  /** Expose `window.__lab = { stage, engine, store }` for debugging (pass the dev-mode flag). */
  expose?: boolean;
}

export interface MountedLab {
  stage: Stage;
  store: Store;
  ctx: AppContext;
}

/**
 * Boot a lab: the shared renderer with the lab's 3D worlds, the application shell, deep links
 * (`#scene/part`) and the render loop that steps the simulation.
 */
export function mountLab<S extends LabSim>(def: LabDefinition<S>, opts: MountOptions): MountedLab {
  configureI18n({ storageKey: `${def.id}:lang` });
  const store = createStore(def.defaultScene);
  let app: App<S> | null = null;

  const stage = new Stage(opts.viewport, {
    onPick: (id) => app?.ctx.selectPart(id, { frame: false }),
    onHotspot: (hs) => {
      if (!app) return;
      if (hs.goto) app.ctx.gotoScene(hs.goto);
      else app.ctx.selectPart(hs.partId);
    },
    onDoublePick: (id) => {
      if (!app) return;
      // double-click: isolate that part (or come back to the whole device on empty space)
      if (id) {
        app.ctx.selectPart(id, { frame: false });
        store.set({ isolate: true });
        requestAnimationFrame(() => stage.frameParts([id], 1.5));
      } else {
        store.set({ isolate: false, selected: null });
        stage.frameAll();
      }
    },
    onHover: () => {},
  });
  for (const scene of def.scenes) stage.register(scene.module);
  stage.setActive(store.state.scene);
  // start on an overview of the whole device, sized to the actual viewport
  requestAnimationFrame(() => stage.frameAll(0.01));

  const display = new DisplayController(def, stage, store);
  if (opts.expose) Object.assign(window, { __lab: { stage, engine: def.sim, store } });
  app = new App(def, opts.app, opts.viewport, stage, store, display);
  const mounted = app;

  // deep links: #scene, optionally #scene/part-id
  const applyHash = (): void => {
    const [scene, part] = location.hash.replace('#', '').split('/');
    if (def.scenes.some((s) => s.id === scene)) {
      store.set({ scene });
      if (part) mounted.ctx.selectPart(part);
    }
  };
  applyHash();
  window.addEventListener('hashchange', applyHash);

  const view: ViewOpts = { slowMo: 1, cutaway: false, schematic: false, time: 0 };
  let last = performance.now();
  const frame = (now: number): void => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    def.sim.step(dt);
    view.time += dt;
    view.slowMo = def.sim.params.slowMo;
    view.cutaway = store.state.cutaway;
    view.schematic = store.state.schematic;
    const active = stage.active;
    active.update(def.sim.state, dt, view);
    def.onFrame?.({ sim: def.sim, dt, view, activeScene: active.id });
    mounted.tick(dt);
    // the drawings viewer covers the 3D view: no need to render it meanwhile
    if (store.state.mode !== 'plans') stage.render(dt);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  return { stage, store, ctx: mounted.ctx };
}
