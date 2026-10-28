#!/usr/bin/env node
// Self-test of the pure logic of the spoken guide (src/narration): manifest reading, cue scheduling, seek replay, captions.
// No dependency, no browser. Run: node tools/narration/selftest.mjs
// (Node 22.18+ runs the TypeScript source as it is; older versions use the built `dist/narration/index.js`.)
import assert from 'node:assert/strict';

const load = async () => {
  try {
    return await import('../../src/narration/index.ts');
  } catch (err) {
    console.log(`(source not loadable: ${err.code ?? err.message}; using dist/)`);
    return await import('../../dist/narration/index.js');
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

const cues = [
  { t: 0, do: { scene: 'site' } },
  { t: 2, do: { frame: ['penstock'] } },
  { t: 4, do: { explode: 0.5 } },
  { t: 6, do: { select: 'turbine' } },
  { t: 6, do: { xray: true } },
  { t: 8, do: { home: true } },
  { t: 10, do: { explode: 0 } },
  { t: 12, do: { lab: 'preset', arg: 'valve-1' } },
  { t: 14, do: { lab: 'preset', arg: 'valve-2' } },
  { t: 14, do: { lab: 'time', arg: '600' } },
];

test('cue kinds: framings share one, hooks are told apart by name', () => {
  assert.equal(K.cueKind({ frame: ['a'] }), 'camera');
  assert.equal(K.cueKind({ home: true }), 'camera');
  assert.equal(K.cueKind({ select: null }), 'select');
  assert.equal(K.cueKind({ lab: 'preset' }), 'lab:preset');
  assert.notEqual(K.cueKind({ lab: 'preset' }), K.cueKind({ lab: 'time' }));
  for (const [a, kind] of [
    [{ scene: 'x' }, 'scene'],
    [{ explode: 1 }, 'explode'],
    [{ xray: false }, 'xray'],
    [{ cutaway: true }, 'cutaway'],
    [{ flows: true }, 'flows'],
    [{ isolate: true }, 'isolate'],
    [{ mode: 'sim' }, 'mode'],
  ]) {
    assert.equal(K.cueKind(a), kind);
  }
});

test('dueCues: after `from`, up to and including `to`', () => {
  assert.deepEqual(
    K.dueCues(cues, 0, 2).map((c) => c.t),
    [2],
  );
  assert.deepEqual(
    K.dueCues(cues, -1, 0).map((c) => c.t),
    [0],
  );
  assert.deepEqual(
    K.dueCues(cues, 5.9, 6).map((c) => c.do),
    [{ select: 'turbine' }, { xray: true }],
  );
  assert.deepEqual(K.dueCues(cues, 14, 20), []);
});

test('replayCues: the last cue of each kind at or before t, in script order', () => {
  assert.deepEqual(K.replayCues(cues, -1), []);
  assert.deepEqual(
    K.replayCues(cues, 0).map((c) => c.do),
    [{ scene: 'site' }],
  );
  // at 7: scene, camera (frame), explode 0.5, select, xray
  assert.deepEqual(
    K.replayCues(cues, 7).map((c) => c.do),
    [{ scene: 'site' }, { frame: ['penstock'] }, { explode: 0.5 }, { select: 'turbine' }, { xray: true }],
  );
  // at 9: the home (camera) replaces the frame; the order is the script's
  assert.deepEqual(
    K.replayCues(cues, 9).map((c) => c.do),
    [{ scene: 'site' }, { explode: 0.5 }, { select: 'turbine' }, { xray: true }, { home: true }],
  );
  // at 13: explode 0 replaces 0.5; one preset
  const at13 = K.replayCues(cues, 13).map((c) => c.do);
  assert.ok(at13.some((a) => a.explode === 0));
  assert.ok(!at13.some((a) => a.explode === 0.5));
  assert.equal(at13.filter((a) => a.lab === 'preset').length, 1);
  // at the end: the last preset and the time hook both stay (one state per hook name)
  const end = K.replayCues(cues, 99).map((c) => c.do);
  assert.deepEqual(
    end
      .filter((a) => a.lab)
      .map((a) => a.arg)
      .sort(),
    ['600', 'valve-2'],
  );
});

test('replay is what playing from the start would have left', () => {
  // playing through t and replaying at t give the same last cue per kind
  for (const t of [0, 1, 2, 3.9, 4, 6, 7.5, 8, 11, 13, 14, 20]) {
    const played = new Map();
    for (const c of K.dueCues(cues, -1, t)) played.set(K.cueKind(c.do), c);
    const replayed = new Map(K.replayCues(cues, t).map((c) => [K.cueKind(c.do), c]));
    assert.deepEqual([...replayed.keys()].sort(), [...played.keys()].sort(), `kinds at ${t}`);
    for (const [k, c] of played) assert.equal(replayed.get(k), c, `${k} at ${t}`);
  }
});

test('CueClock: cues fire once, in order, as the clock passes them', () => {
  const clock = new K.CueClock(cues);
  const first = clock.seek(0);
  assert.equal(first.replay, true);
  assert.deepEqual(
    first.cues.map((c) => c.do),
    [{ scene: 'site' }],
  );
  const fired = [];
  for (let t = 0.1; t <= 15; t += 0.1) {
    const step = clock.advance(t);
    assert.equal(step.replay, false, `no jump at ${t}`);
    fired.push(...step.cues.map((c) => c.t));
  }
  assert.deepEqual(fired, [2, 4, 6, 6, 8, 10, 12, 14, 14]);
  // the same reading again fires nothing
  assert.deepEqual(clock.advance(15).cues, []);
});

test('CueClock: a seek (back or far forward) gives the state to rebuild, then plays on', () => {
  const clock = new K.CueClock(cues);
  clock.seek(0);
  clock.advance(5);
  const back = clock.advance(1); // moved back by 4 s
  assert.equal(back.replay, true);
  assert.deepEqual(
    back.cues.map((c) => c.do),
    [{ scene: 'site' }],
  );
  const next = clock.advance(2.1);
  assert.equal(next.replay, false);
  assert.deepEqual(
    next.cues.map((c) => c.t),
    [2],
  );
  const far = clock.advance(11); // a sleeping tab or a drag on the slider
  assert.equal(far.replay, true);
  assert.deepEqual(
    far.cues.map((c) => c.do),
    [{ scene: 'site' }, { select: 'turbine' }, { xray: true }, { home: true }, { explode: 0 }],
  );
  assert.deepEqual(
    clock.advance(12.2).cues.map((c) => c.t),
    [12],
  );
  // a tiny step back (rounding of the audio clock) is not a seek
  assert.equal(clock.advance(12.19).replay, false);
});

test('captionAt: inside a caption only', () => {
  const caps = [
    { t0: 0, t1: 1.5, text: 'a' },
    { t0: 1.5, t1: 3, text: 'b' },
    { t0: 4, t1: 5, text: 'c' },
  ];
  assert.equal(K.captionAt(caps, 0).text, 'a');
  assert.equal(K.captionAt(caps, 1.5).text, 'b');
  assert.equal(K.captionAt(caps, 3.5), null);
  assert.equal(K.captionAt(caps, 4.99).text, 'c');
  assert.equal(K.captionAt(caps, 5), null);
});

test('splitCaptions: pieces fit, cover the same time and keep every word', () => {
  const caps = [
    { t0: 0, t1: 2, text: 'Voici la roue.' },
    {
      t0: 2,
      t1: 14,
      text: 'Elle tourne vite, très vite, parce que l’eau arrive à grande vitesse sur les augets, et chaque jet donne un petit coup de pouce à la roue entière.',
    },
  ];
  const out = K.splitCaptions(caps, 60);
  assert.equal(out[0].text, 'Voici la roue.');
  assert.ok(out.length > 2);
  for (const c of out) assert.ok(c.text.length <= 60, `"${c.text}" is ${c.text.length} long`);
  assert.equal(out[0].t0, 0);
  assert.ok(Math.abs(out[out.length - 1].t1 - 14) < 1e-9);
  for (let i = 1; i < out.length; i++) assert.ok(Math.abs(out[i].t0 - out[i - 1].t1) < 1e-9, 'no gap, no overlap');
  assert.equal(
    out
      .slice(1)
      .map((c) => c.text)
      .join(' '),
    caps[1].text,
  );
  // the cut falls on a pause when there is one near the middle
  const pause = K.splitCaptions([{ t0: 0, t1: 10, text: 'Premier groupe de mots, second groupe de mots ici' }], 30);
  assert.equal(pause[0].text, 'Premier groupe de mots,');
  // nothing to cut in a single long word
  assert.equal(K.splitCaptions([{ t0: 0, t1: 1, text: 'Anticonstitutionnellement' }], 5).length, 1);
});

const raw = {
  lang: 'fr',
  voiceLabel: { fr: 'Voix de synthèse', en: 'Synthetic voice' },
  segments: [
    {
      id: 'intro',
      scope: 'intro',
      title: 'Présentation',
      scene: 'site',
      file: 'intro.mp3',
      duration: 20,
      captions: [
        { t0: 0, t1: 2, text: 'Bonjour.' },
        { t0: 3, t1: 2, text: 'bad' },
      ],
      cues: [
        { t: 5, do: { frame: ['penstock'] } },
        { t: 1, do: { scene: 'site' } },
        { t: 5, do: { explode: 2 } },
        { t: 7, do: { teleport: true } },
        { t: -1, do: { home: true } },
      ],
    },
    {
      id: 'p-nozzle',
      scope: 'part:nozzle',
      title: 'Injecteur',
      file: 'p-nozzle.mp3',
      duration: 8,
      captions: [],
      cues: [],
    },
    { id: 'dup', scope: 'part:nozzle', title: 'Doublon', file: 'x.mp3', duration: 8 },
    { id: 'no-file', scope: 'scene:site', title: 'x', duration: 8 },
    { id: 'weird', scope: 'sceneX', title: 'x', file: 'w.mp3', duration: 8 },
  ],
};

test('readManifest: keeps what is usable, sorts cues (stable), clamps, reports the rest', () => {
  const { manifest, problems } = K.readManifest(raw);
  assert.ok(manifest);
  assert.deepEqual(
    manifest.segments.map((s) => s.scope),
    ['intro', 'part:nozzle'],
  );
  const intro = manifest.segments[0];
  assert.deepEqual(
    intro.cues.map((c) => c.t),
    [1, 5, 5],
  );
  assert.deepEqual(intro.cues[1].do, { frame: ['penstock'] }); // same time: script order kept
  assert.deepEqual(intro.cues[2].do, { explode: 1 }); // 2 is clamped to 1
  assert.equal(intro.captions.length, 1);
  assert.equal(intro.scene, 'site');
  assert.ok(problems.some((p) => p.includes('scope part:nozzle appears twice')));
  assert.ok(problems.some((p) => p.includes('malformed cue')));
  assert.ok(problems.length >= 5);
  assert.equal(manifest.voiceLabel.en, 'Synthetic voice');
});

test('readManifest: garbage gives no manifest, never throws', () => {
  for (const bad of [null, undefined, 3, 'x', {}, { segments: 'no' }, { segments: [] }, { segments: [{}] }]) {
    assert.equal(K.readManifest(bad).manifest, null);
  }
});

test('validateManifest: names every id the lab does not know', () => {
  const { manifest } = K.readManifest({
    ...raw,
    segments: [
      ...raw.segments.slice(0, 2),
      {
        id: 'bad',
        scope: 'scene:moon',
        title: 'x',
        scene: 'mars',
        file: 'b.mp3',
        duration: 5,
        cues: [
          { t: 1, do: { scene: 'venus' } },
          { t: 2, do: { frame: ['penstock', 'ghost'] } },
          { t: 3, do: { select: 'phantom' } },
          { t: 4, do: { mode: 'karaoke' } },
          { t: 9, do: { home: true } },
        ],
      },
    ],
  });
  const known = { scenes: ['site', 'turbine'], parts: ['penstock', 'nozzle'] };
  const problems = K.validateManifest(manifest, known);
  for (const needle of [
    'world "moon"',
    'starting world "mars"',
    'world "venus"',
    'part "ghost"',
    'part "phantom"',
    'mode "karaoke"',
    'after the end',
  ]) {
    assert.ok(
      problems.some((p) => p.includes(needle)),
      `expected a problem about ${needle}: ${problems.join(' | ')}`,
    );
  }
  assert.ok(!problems.some((p) => p.includes('"penstock"') || p.includes('"nozzle"')));
  // a manifest that fits the lab has none
  const ok = K.readManifest({ ...raw, segments: raw.segments.slice(0, 2) }).manifest;
  assert.deepEqual(K.validateManifest(ok, known), []);
});

test('scopes and time', () => {
  assert.equal(K.scopeKind('intro'), 'intro');
  assert.equal(K.scopeKind('part:wheel-hub'), 'part');
  assert.equal(K.scopeId('part:wheel-hub'), 'wheel-hub');
  assert.equal(K.scopeId('intro'), '');
  assert.equal(K.isScope('scene:site'), true);
  assert.equal(K.isScope('scene:'), false);
  assert.equal(K.isScope('introduction'), false);
  assert.equal(K.formatTime(0), '0:00');
  assert.equal(K.formatTime(42.4), '0:42');
  assert.equal(K.formatTime(90), '1:30');
  assert.equal(K.formatTime(600), '10:00');
});

console.log(process.exitCode ? '\nFAILED' : `\n${n} tests passed`);
