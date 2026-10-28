import type { SceneId, SceneModule } from './types';

// A world that is built at its first visit. The lab declares it as an ordinary `SceneDef.module` (so everything that reads
// `scene.module` keeps its type), made with `lazyModule`; the kit asks for the builder instead of the world.

const BUILDER = Symbol('lab-kit.lazy-module');

/**
 * A `SceneModule` that is built the first time the kit shows the world, or anything reads it. Use it as the `module` of a
 * `SceneDef` to load and build a heavy world only when the visitor goes there:
 *
 *     module: lazyModule('valve', () => createValveScene())
 *
 * `id` must be the id of the module that `make` returns (and of the `SceneDef`).
 */
export function lazyModule<S = unknown>(id: SceneId, make: () => SceneModule<S>): SceneModule<S> {
  let built: SceneModule<S> | null = null;
  const build = () => (built ??= make());
  return new Proxy({} as SceneModule<S>, {
    get(_target, prop) {
      if (prop === BUILDER) return build;
      if (prop === 'id' && !built) return id;
      const mod = build();
      const value = Reflect.get(mod, prop);
      return typeof value === 'function' ? value.bind(mod) : value;
    },
    set(_target, prop, value) {
      return Reflect.set(build(), prop, value);
    },
  });
}

/** The function that builds a world made with `lazyModule`, or `null` for an ordinary module. */
export function lazyBuilder(mod: SceneModule): (() => SceneModule) | null {
  const build = (mod as unknown as Record<symbol, unknown>)[BUILDER];
  return typeof build === 'function' ? (build as () => SceneModule) : null;
}
