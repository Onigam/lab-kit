#!/usr/bin/env node
// Self-test of the look decisions (src/three/look-policy.ts): the starting quality of a device, the pixel ratio a slow device
// steps down to, the tone of a world. No dependency, no browser. Run: node tools/three/selftest.mjs
// (Node 22.18+ runs the TypeScript source as it is; older versions use the built `dist/three/look-policy.js`.)
import assert from 'node:assert/strict';

const load = async () => {
  try {
    return await import('../../src/three/look-policy.ts');
  } catch (err) {
    console.log(`(source not loadable: ${err.code ?? err.message}; using dist/)`);
    return await import('../../dist/three/look-policy.js');
  }
};
const K = await load();

let n = 0;
const test = (name, fn) => {
  try {
    fn();
    n++;
    console.log(`ok   ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}\n${err.stack}`);
    process.exitCode = 1;
  }
};

const device = (o = {}) => ({ maxSamples: 4, devicePixelRatio: 2, automated: false, forceFull: false, ...o });

test('a capable device gets MSAA 4, pixel ratio up to 2, adaptive', () => {
  assert.deepEqual(K.planQuality(device({ deviceMemory: 8 })), {
    msaa: 4,
    fxaa: false,
    maxPixelRatio: 2,
    adaptive: true,
  });
  assert.deepEqual(K.planQuality(device()), { msaa: 4, fxaa: false, maxPixelRatio: 2, adaptive: true });
});
test('a device with 2 GB or less draws FXAA at pixel ratio 1.5', () => {
  assert.deepEqual(K.planQuality(device({ deviceMemory: 2 })), {
    msaa: 0,
    fxaa: true,
    maxPixelRatio: 1.5,
    adaptive: true,
  });
});
test('a GPU without 4 samples falls back to FXAA', () => {
  assert.deepEqual(K.planQuality(device({ maxSamples: 2 })), { msaa: 0, fxaa: true, maxPixelRatio: 2, adaptive: true });
});
test('an automated browser and quality=full get the full, fixed picture, even on a small device', () => {
  const full = { msaa: 4, fxaa: false, maxPixelRatio: 2, adaptive: false };
  assert.deepEqual(K.planQuality(device({ deviceMemory: 1, automated: true })), full);
  assert.deepEqual(K.planQuality(device({ deviceMemory: 1, forceFull: true })), full);
});

const run = (g, ms, frames, t0 = 0) => {
  let t = t0;
  let last = null;
  for (let i = 0; i < frames; i++) {
    t += ms;
    const r = g.push(ms, t);
    if (r !== null) last = r;
  }
  return { last, t };
};
test('fast frames keep the pixel ratio', () => {
  const g = new K.FrameGovernor(2);
  assert.equal(run(g, 16.7, 600).last, null);
  assert.equal(g.ratio, 2);
});
test('slow frames step down one level, then wait before judging again', () => {
  const g = new K.FrameGovernor(2);
  const a = run(g, 33.3, 90);
  assert.equal(a.last, 1.75);
  // during the cooldown nothing changes
  const b = run(g, 33.3, 60, a.t);
  assert.equal(b.last, null);
  // then a full window of slow frames again: one more step
  const c = run(g, 33.3, 200, b.t);
  assert.ok(c.last !== null && c.last < 1.75);
});
test('it never goes below 1 nor back up', () => {
  const g = new K.FrameGovernor(2, { cooldownMs: 0 });
  run(g, 50, 2000);
  assert.equal(g.ratio, 1);
  run(g, 5, 2000);
  assert.equal(g.ratio, 1);
});
test('long gaps (a hidden tab, a world being built) are ignored', () => {
  const g = new K.FrameGovernor(2);
  assert.equal(run(g, 400, 300).last, null);
});
test('a device at pixel ratio 1.3 starts at 1.3', () => {
  const g = new K.FrameGovernor(1.3, { cooldownMs: 0 });
  assert.deepEqual(g.levels, [1.3, 1.25, 1]);
});

test("by default every world keeps the picture of kit 0.4: ACES at 1, three's room", () => {
  assert.deepEqual(K.resolveWorldLook({ wantsEnv: true }), {
    toneMapping: 'aces',
    exposure: 1,
    saturation: 1,
    environment: 'room',
    ao: true,
    aoRadius: undefined,
  });
  const land = K.resolveWorldLook({});
  assert.equal(land.toneMapping, 'aces');
  assert.equal(land.ao, false);
});
test('a world that opts in to the paper studio is Neutral at 1.2 with the warm environment', () => {
  const w = K.resolveWorldLook({ wantsEnv: true, look: { ...K.PAPER_STUDIO } });
  assert.equal(w.toneMapping, 'neutral');
  assert.equal(w.exposure, 1.2);
  assert.equal(w.environment, 'paper');
});
test("a world's own look wins over the defaults", () => {
  const w = K.resolveWorldLook({ look: { toneMapping: 'neutral', exposure: 1.32, saturation: 0.86, aoRadius: 2 } });
  assert.equal(w.toneMapping, 'neutral');
  assert.equal(w.exposure, 1.32);
  assert.equal(w.saturation, 0.86);
  assert.equal(w.aoRadius, 2);
  assert.equal(K.resolveWorldLook({ wantsEnv: true, look: { ...K.PAPER_STUDIO, ao: false } }).ao, false);
});

console.log(`\n${n} tests passed${process.exitCode ? ', some failed' : ''}`);
