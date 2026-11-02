// The local voice: Qwen3-TTS through Voicebox, on this machine, with no credit (docs/narration.md).
// Qwen gives no timings, so Whisper listens to the audio and alignWords() lays its words on the script, to fill the same
// character timings as ElevenLabs: the subtitles and the 3D cues are made the same way for both engines.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE = process.env.VOICEBOX_URL ?? 'http://127.0.0.1:17493';
const WHISPER = process.env.WHISPER_BIN ?? '/opt/homebrew/bin/whisper';
export const LOCAL_MODEL = 'qwen3-tts-1.7B';
// the level of the guides already in the labs, between −26 and −29 LUFS
const TARGET_LUFS = -27;
const SEED = 42;

const tokensOf = (text) =>
  [...text.matchAll(/[\p{L}\p{N}]+/gu)].map((m) => ({
    text: m[0].normalize('NFD').replace(/\p{M}/gu, '').toLowerCase(),
    from: m.index,
    to: m.index + m[0].length,
  }));

function closeEnough(a, b) {
  const room = Math.floor(Math.min(a.length, b.length) / 4);
  if (Math.abs(a.length - b.length) > room) return false;
  let row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length] <= room;
}

/**
 * Lays the words Whisper heard on the script. Words it heard differently (a number in digits, a rare term) stay between the
 * words it did match, and share the time between them in proportion to their characters.
 * @returns the same shape as ElevenLabs' alignment, one entry per character of `spoken`, and how many script words were matched
 */
export function alignWords(spoken, words, duration) {
  const script = tokensOf(spoken);
  const heard = words.flatMap((w) => {
    const parts = tokensOf(w.word);
    const span = w.word.trim().length || 1;
    const offset = w.word.length - w.word.trimStart().length;
    return parts.map((p) => ({
      text: p.text,
      start: w.start + ((w.end - w.start) * (p.from - offset)) / span,
      end: w.start + ((w.end - w.start) * (p.to - offset)) / span,
    }));
  });

  // the best common sequence: an exact word counts more than a close one
  const score = Array.from({ length: script.length + 1 }, () => new Float64Array(heard.length + 1));
  const gain = (i, j) => (script[i].text === heard[j].text ? 2 : closeEnough(script[i].text, heard[j].text) ? 1 : 0);
  for (let i = script.length - 1; i >= 0; i--)
    for (let j = heard.length - 1; j >= 0; j--) {
      const g = gain(i, j);
      score[i][j] = Math.max(score[i + 1][j], score[i][j + 1], g ? g + score[i + 1][j + 1] : 0);
    }
  const anchors = [];
  for (let i = 0, j = 0; i < script.length && j < heard.length; ) {
    const g = gain(i, j);
    if (g && score[i][j] === g + score[i + 1][j + 1]) {
      anchors.push({ from: script[i].from, to: script[i].to, start: heard[j].start, end: heard[j].end });
      i++;
      j++;
    } else if (score[i + 1][j] >= score[i][j + 1]) i++;
    else j++;
  }

  // knots: (character index, time), rising; between two knots the characters share the time evenly
  const knots = [{ at: 0, t: 0 }];
  let last = 0;
  for (const a of anchors) {
    const start = Math.max(a.start, last);
    const end = Math.max(a.end, start);
    if (a.from > knots.at(-1).at) knots.push({ at: a.from, t: start });
    knots.push({ at: a.to, t: end });
    last = end;
  }
  if (knots.at(-1).at < spoken.length) knots.push({ at: spoken.length, t: Math.max(duration, last) });
  else knots.at(-1).t = Math.max(duration, knots.at(-1).t);

  const timeAt = new Float64Array(spoken.length + 1);
  for (let k = 1; k < knots.length; k++) {
    const [a, b] = [knots[k - 1], knots[k]];
    for (let c = a.at; c <= b.at; c++) timeAt[c] = a.t + ((b.t - a.t) * (c - a.at)) / Math.max(1, b.at - a.at);
  }
  return {
    alignment: {
      characters: Array.from({ length: spoken.length }, (_, i) => spoken[i]),
      character_start_times_seconds: Array.from(timeAt.subarray(0, spoken.length)),
      character_end_times_seconds: Array.from(timeAt.subarray(1, spoken.length + 1)),
    },
    matched: anchors.length,
    words: script.length,
  };
}

async function api(route, init) {
  let res;
  try {
    res = await fetch(`${BASE}${route}`, init);
  } catch {
    throw new Error(`Voicebox does not answer at ${BASE}: open the application.`);
  }
  if (!res.ok) throw new Error(`Voicebox ${route} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res;
}

/** The profile named for a language. Refuses to guess: a profile cloned from a real person must never reach a lab. */
export async function profileOf(name) {
  const all = await (await api('/profiles')).json();
  const found = all.find((p) => p.name === name);
  if (!found) throw new Error(`no Voicebox profile named "${name}"`);
  return found;
}

/** The integrated loudness of a file; ffmpeg prints it on stderr. */
function lufsOf(file) {
  const { stderr } = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=framelog=quiet', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = /I:\s*(-?[\d.]+) LUFS/.exec(stderr ?? '');
  return m ? Number(m[1]) : null;
}

/** One segment: the voice, its MP3 at the level of the guides, and its character timings. */
export async function synthLocal(spoken, lang, profile) {
  const generated = await (
    await api('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_id: profile.id, text: spoken, language: lang, seed: SEED, engine: 'qwen', model_size: '1.7B', normalize: true }),
    })
  ).json();
  let state = generated;
  for (const t0 = Date.now(); !['completed', 'failed', 'error'].includes(state.status); ) {
    if (Date.now() - t0 > 30 * 60 * 1000) throw new Error(`Voicebox: no result after 30 minutes for ${generated.id}`);
    await new Promise((r) => setTimeout(r, 3000));
    state = await (await api(`/history/${generated.id}`)).json();
  }
  if (state.status !== 'completed') throw new Error(`Voicebox: ${state.status}: ${state.error}`);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'voicebox-'));
  try {
    const wav = path.join(dir, 'voice.wav');
    fs.writeFileSync(wav, Buffer.from(await (await api(`/audio/${generated.id}`)).arrayBuffer()));
    // our own segment leaves the owner's Voicebox history once it is on disk
    await api(`/history/${generated.id}`, { method: 'DELETE' }).catch(() => {});

    const measured = lufsOf(wav);
    const gain = measured === null ? 0 : TARGET_LUFS - measured;
    const mp3 = path.join(dir, 'voice.mp3');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-af', `volume=${gain.toFixed(2)}dB`, '-ar', '44100', '-ac', '1', '-b:a', '64k', mp3]);

    execFileSync(WHISPER, [wav, '--model', 'small', '--language', lang, '--output_format', 'json', '--word_timestamps', 'True', '--fp16', 'False', '--output_dir', dir], { stdio: 'ignore' });
    const heard = JSON.parse(fs.readFileSync(path.join(dir, 'voice.json'), 'utf8'));
    const words = heard.segments.flatMap((s) => s.words ?? []);
    const { alignment, matched, words: total } = alignWords(spoken, words, state.duration);
    return { audio: fs.readFileSync(mp3), alignment, heard: heard.text.trim(), matched, total };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
