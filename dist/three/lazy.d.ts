import type { SceneId, SceneModule } from './types';
/**
 * A `SceneModule` that is built the first time the kit shows the world, or anything reads it. Use it as the `module` of a
 * `SceneDef` to load and build a heavy world only when the visitor goes there:
 *
 *     module: lazyModule('valve', () => createValveScene())
 *
 * `id` must be the id of the module that `make` returns (and of the `SceneDef`).
 */
export declare function lazyModule<S = unknown>(id: SceneId, make: () => SceneModule<S>): SceneModule<S>;
/** The function that builds a world made with `lazyModule`, or `null` for an ordinary module. */
export declare function lazyBuilder(mod: SceneModule): (() => SceneModule) | null;
