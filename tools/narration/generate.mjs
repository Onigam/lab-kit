#!/usr/bin/env node
// Generate the spoken narration of a lab from its script (docs/narration.md): ElevenLabs text-to-speech with timestamps,
// one MP3 per segment, a manifest with subtitles and the 3D cues. No dependency (Node 18+).
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : fallback;
};
const SRC = opt('src');
const OUT = opt('out');
const ONLY = typeof opt('only') === 'string' ? opt('only').split(',') : null;
const DRY = !!opt('dry-run', false);
const FORCE = !!opt('force', false);
if (!SRC || !OUT) {
  console.error(
    'Usage: node generate.mjs --src narration/fr.json --out public/audio/fr [--only id,id] [--dry-run] [--force]',
  );
  process.exit(2);
}

// the key comes from the environment or from a private file outside any repository
const envFile = path.join(os.homedir(), '.config', 'lab-narration', 'elevenlabs.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}
const KEY = process.env.ELEVENLABS_API_KEY;
const VOICE = process.env.ELEVENLABS_VOICE_ID;
const MODEL = process.env.ELEVENLABS_MODEL ?? 'eleven_v4';

const ACTIONS = {
  scene: (a) => ({ scene: need(a) }),
  home: () => ({ home: true }),
  frame: (a) => ({
    frame: need(a)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  }),
  select: (a) => ({ select: need(a) === 'none' ? null : need(a) }),
  explode: (a) => ({ explode: Math.min(1, Math.max(0, Number(need(a)))) }),
  xray: (a) => ({ xray: onoff(a) }),
  cutaway: (a) => ({ cutaway: onoff(a) }),
  flows: (a) => ({ flows: onoff(a) }),
  isolate: (a) => ({ isolate: onoff(a) }),
  mode: (a) => ({ mode: need(a) }),
  lab: (a) => {
    const [name, ...rest] = need(a).split(':');
    return rest.length ? { lab: name, arg: rest.join(':') } : { lab: name };
  },
};
function need(a) {
  if (a === undefined || a === '') throw new Error('missing argument');
  return a;
}
function onoff(a) {
  if (a === 'on') return true;
  if (a === 'off') return false;
  throw new Error(`expected on or off, got "${a}"`);
}

/** Split the script text into the spoken text and the cue markers (with the index of the next spoken character). */
function parseText(id, text) {
  const cues = [];
  let spoken = '';
  let last = 0;
  for (const m of text.matchAll(/\[\[([a-z]+)(?::([^\]]*))?\]\]/g)) {
    spoken += text.slice(last, m.index);
    last = m.index + m[0].length;
    const make = ACTIONS[m[1]];
    if (!make) throw new Error(`${id}: unknown cue "${m[1]}"`);
    try {
      cues.push({ at: spoken.length, do: make(m[2]) });
    } catch (e) {
      throw new Error(`${id}: cue [[${m[1]}${m[2] === undefined ? '' : ':' + m[2]}]]: ${e.message}`);
    }
  }
  spoken += text.slice(last);
  // tidy the spaces the markers leave; cue indices are recomputed on the tidied text
  const tidy = [];
  let out = '';
  let ci = 0;
  const pending = cues.map((c) => c.at);
  for (let i = 0; i <= spoken.length; i++) {
    while (ci < pending.length && pending[ci] === i) tidy.push({ at: out.length, do: cues[ci++].do });
    if (i === spoken.length) break;
    const ch = spoken[i];
    if (/\s/.test(ch) && (out === '' || /\s$/.test(out))) continue;
    out += /\s/.test(ch) ? ' ' : ch;
  }
  return { spoken: out.trimEnd(), cues: tidy.map((c) => ({ ...c, at: Math.min(c.at, out.trimEnd().length) })) };
}

/** Subtitles: cut at sentence ends, then at commas or semicolons when a line gets too long. */
function captionsOf(spoken, startAt, endAt) {
  const lines = [];
  const re = /[^.!?…]+(?:[.!?…]+|$)\s*/g;
  for (const m of spoken.matchAll(re)) {
    let from = m.index;
    let chunk = m[0];
    while (chunk.trim().length > 110) {
      const cut = Math.max(chunk.lastIndexOf(', ', 90), chunk.lastIndexOf('; ', 90));
      if (cut < 30) break;
      lines.push([from, from + cut + 1]);
      from += cut + 2;
      chunk = chunk.slice(cut + 2);
    }
    if (chunk.trim()) lines.push([from, from + chunk.length]);
  }
  return lines.map(([a, b]) => {
    const text = spoken.slice(a, b).trim();
    const lead = spoken.slice(a, b).length - spoken.slice(a, b).trimStart().length;
    const i0 = Math.min(a + lead, spoken.length - 1);
    const i1 = Math.max(a + lead, Math.min(b - 1, spoken.length - 1));
    return { t0: startAt(i0), t1: endAt(i1), text };
  });
}

const script = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const settings = script.settings ?? {};
const manifestPath = path.join(OUT, 'manifest.json');
const previous = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : { segments: [] };
const known = new Map(previous.segments.map((s) => [s.id, s]));

const seen = new Set();
const plan = script.segments.map((seg) => {
  if (seen.has(seg.id)) throw new Error(`duplicate segment id ${seg.id}`);
  seen.add(seg.id);
  if (!/^(intro|scene:[\w-]+|part:[\w-]+|lesson:[\w-]+)$/.test(seg.scope))
    throw new Error(`${seg.id}: bad scope "${seg.scope}"`);
  const { spoken, cues } = parseText(seg.id, seg.text);
  if (spoken.length > 2500) throw new Error(`${seg.id}: ${spoken.length} characters, cut it in two (2500 max)`);
  const hash = createHash('sha256')
    .update(
      JSON.stringify({
        spoken,
        cues: cues.map((c) => [c.at, c.do]),
        MODEL,
        VOICE: VOICE ?? '',
        settings,
        lang: script.lang,
      }),
    )
    .digest('hex')
    .slice(0, 16);
  const file = `${seg.id.replace(/[^\w-]+/g, '_')}.mp3`;
  const old = known.get(seg.id);
  const upToDate = !FORCE && old && old.hash === hash && fs.existsSync(path.join(OUT, file));
  return { seg, spoken, cues, hash, file, upToDate };
});

const selected = plan.filter((p) => !ONLY || ONLY.includes(p.seg.id) || ONLY.includes(p.seg.scope));
const todo = selected.filter((p) => !p.upToDate);
const sum = (xs) => xs.reduce((n, p) => n + p.spoken.length, 0);
console.log(
  `${plan.length} segments, ${sum(plan)} characters in the script (model ${MODEL}, language ${script.lang}).`,
);
console.log(
  `${selected.length - todo.length} up to date, ${todo.length} to generate: ${sum(todo)} characters (about ${sum(todo)} credits).`,
);
if (DRY) {
  for (const p of todo)
    console.log(`  ${p.seg.id.padEnd(34)} ${String(p.spoken.length).padStart(5)} chars, ${p.cues.length} cues`);
  process.exit(0);
}
if (todo.length && (!KEY || !VOICE)) {
  console.error(
    'ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID are needed (environment or ~/.config/lab-narration/elevenlabs.env).',
  );
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });

async function synth(spoken) {
  const body = { text: spoken, model_id: MODEL, language_code: script.lang };
  if (Object.keys(settings).length) body.voice_settings = settings;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE}/with-timestamps?output_format=mp3_44100_64`,
      {
        method: 'POST',
        headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
    if (res.ok) return res.json();
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      await new Promise((r) => setTimeout(r, 2000 * attempt));
      continue;
    }
    throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}

const results = new Map();
for (const p of todo) {
  process.stdout.write(`  ${p.seg.id} (${p.spoken.length} chars) … `);
  const d = await synth(p.spoken);
  const a = d.alignment;
  if (!a || a.characters.length !== p.spoken.length) {
    // the service may normalise the text: align by position as far as it goes
    console.warn(`\n  note: ${a ? a.characters.length : 0} aligned characters for ${p.spoken.length}`);
  }
  fs.writeFileSync(path.join(OUT, p.file), Buffer.from(d.audio_base64, 'base64'));
  results.set(p.seg.id, a);
  console.log(`${a.character_end_times_seconds.at(-1).toFixed(1)} s`);
}

const round = (x) => Math.round(x * 100) / 100;
const segments = plan
  .map((p) => {
    const fresh = results.get(p.seg.id);
    if (!fresh) {
      const old = known.get(p.seg.id);
      if (old && p.upToDate) return { ...old, scope: p.seg.scope, title: p.seg.title, scene: p.seg.scene };
      return null; // not generated yet
    }
    const n = fresh.characters.length;
    const startAt = (i) => fresh.character_start_times_seconds[Math.min(i, n - 1)];
    const endAt = (i) => fresh.character_end_times_seconds[Math.min(i, n - 1)];
    const duration = round(fresh.character_end_times_seconds.at(-1));
    return {
      id: p.seg.id,
      scope: p.seg.scope,
      title: p.seg.title,
      ...(p.seg.scene ? { scene: p.seg.scene } : {}),
      file: p.file,
      duration,
      chars: p.spoken.length,
      hash: p.hash,
      captions: captionsOf(p.spoken, startAt, endAt).map((c) => ({ t0: round(c.t0), t1: round(c.t1), text: c.text })),
      cues: p.cues.map((c) => ({
        t: round(c.at >= n ? fresh.character_end_times_seconds.at(-1) : startAt(c.at)),
        do: c.do,
      })),
    };
  })
  .filter(Boolean);

const manifest = {
  lang: script.lang,
  model: MODEL,
  generatedAt: new Date().toISOString(),
  voiceLabel: script.voiceLabel ?? { fr: 'Voix de synthèse', en: 'Synthetic voice' },
  totalSeconds: round(segments.reduce((n, s) => n + s.duration, 0)),
  segments,
};
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(
  `manifest: ${segments.length}/${plan.length} segments, ${manifest.totalSeconds} s of audio → ${manifestPath}`,
);
