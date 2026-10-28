// Measures the tone of a narration script against a reference script (Pelton Lab's by default), see docs/narration-style.md.
//   node tools/narration/tone-stats.mjs <script.json> [reference.json]
// Prints, for each script: spoken characters, average sentence length, sentences longer than 120 characters (subtitles cut at
// sentence ends), exclamations and questions per 1 000 characters, uses of "tu" and digits or symbols in the spoken text.
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const [, , script, reference = join(homedir(), 'Dev/pelton-lab/narration/fr.json')] = process.argv;
if (!script) {
  console.error('usage: node tools/narration/tone-stats.mjs <script.json> [reference.json]');
  process.exit(2);
}

const spoken = (text) =>
  text
    .replace(/\[\[[^\]]*\]\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

function stats(file) {
  const { segments } = JSON.parse(readFileSync(file, 'utf8'));
  let chars = 0;
  let sentences = 0;
  let long = 0;
  let exclamations = 0;
  let questions = 0;
  let tu = 0;
  let symbols = 0;
  for (const s of segments) {
    const text = spoken(s.text);
    chars += text.length;
    for (const sentence of text.split(/(?<=[.!?…])\s+/)) {
      sentences++;
      if (sentence.length > 120) long++;
    }
    exclamations += (text.match(/!/g) ?? []).length;
    questions += (text.match(/\?/g) ?? []).length;
    tu += (text.match(/(?<!\p{L})(tu|ton|ta|tes|toi)(?!\p{L})/giu) ?? []).length;
    symbols += (text.match(/[*≈×Ø″%]|\d/g) ?? []).length;
  }
  const per1000 = (n) => +((n / chars) * 1000).toFixed(2);
  return {
    segments: segments.length,
    chars,
    avgSentence: Math.round(chars / sentences),
    longSentences: long,
    exclamationsPer1000: per1000(exclamations),
    questionsPer1000: per1000(questions),
    tu,
    symbols,
  };
}

console.log('script   ', JSON.stringify(stats(script)));
if (existsSync(reference)) console.log('reference', JSON.stringify(stats(reference)));
