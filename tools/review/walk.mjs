// Walks a lab the way the owner looks at it, for the quality review (docs/lab-quality.md §8). In headless Chrome: every world's
// overview, then every part in its setting (as the app frames it when selected), close and at mid-distance, then the world
// exploded, in x-ray, cut, isolated and with every label, then every mode. Writes the screenshots and an index (`index.md`,
// `index.json`: the shots in order and the console errors) for a reviewer to open one by one. It judges nothing itself.
//
//   npm i --prefix ~/.cache/lab-review puppeteer-core               once (outside every repo)
//   npm run dev                                                      in the lab: dev mode exposes window.__lab
//   URL=http://localhost:5173/ OUT=/some/dir node ~/Dev/lab-kit/tools/review/walk.mjs
//
//   WIDTH=1280 | 768 | 390 (default 1280)   LAB_LANG=fr | en (default fr)   SCENES=site,screw (default all)
//   PARTS=0 skips the parts, MODES=0 skips the modes, CHROME=… another Chrome
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

const deps = process.env.LAB_REVIEW_DEPS ?? path.join(os.homedir(), '.cache/lab-review');
const puppeteer = createRequire(path.join(deps, 'index.js'))('puppeteer-core');
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const { URL: BASE, OUT } = process.env;
if (!BASE || !OUT) throw new Error('Set URL (the lab in dev mode) and OUT (where the screenshots go).');
const WIDTH = Number(process.env.WIDTH ?? 1280);
const LANG = process.env.LAB_LANG === 'en' ? 'en' : 'fr';
const viewport = {
  1280: { width: 1280, height: 800 },
  768: { width: 768, height: 1024 },
  390: { width: 390, height: 844, isMobile: true, hasTouch: true },
}[WIDTH];
if (!viewport) throw new Error('WIDTH is 1280, 768 or 390.');
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});
const page = await browser.newPage();
await page.setViewport(viewport);

const shots = [];
const errors = [];
let current = 'load';
page.on('pageerror', (e) => errors.push({ at: current, text: String(e).slice(0, 300) }));
page.on('console', (m) => m.type() === 'error' && errors.push({ at: current, text: m.text().slice(0, 300) }));
page.on('response', (r) => r.status() >= 400 && errors.push({ at: current, text: `${r.status()} ${r.url()}` }));

await page.goto(BASE, { waitUntil: 'load' });
await page.waitForFunction(() => window.__lab && document.querySelector('.rail button'), { timeout: 150000 });

const settle = async (ms = 600) => {
  await sleep(300);
  await page.waitForFunction(() => !window.__lab.stage.fly, { timeout: 60000 }).catch(() => {});
  await sleep(ms);
};
const snap = async (name, note) => {
  current = name;
  await settle();
  const file = `${String(shots.length).padStart(3, '0')}-${name}.png`;
  await page.screenshot({ path: path.join(OUT, file) });
  shots.push({ file, name, note });
};
const set = (patch) => page.evaluate((p) => window.__lab.store.set(p), patch);
const RESET = {
  mode: 'explore',
  selected: null,
  isolate: false,
  xray: false,
  explode: 0,
  cutaway: false,
  labels: 'main',
};

if (LANG === 'en')
  await page.evaluate(() =>
    [...document.querySelectorAll('.lang-switch button')].find((b) => /^en$/i.test(b.textContent.trim()))?.click(),
  );
await settle(1500);
// what a first visit shows (the invitation to the spoken guide, if the lab has one), then out of the way of the panel
await snap('first-visit', 'as a first visit opens: the invitation to the spoken guide, if the lab has one');
await page.evaluate(() => document.querySelector('.narr-invite__x')?.click());

const sceneCount = await page.evaluate(() => document.querySelectorAll('.scene-switch button').length);
const wanted = process.env.SCENES?.split(',');
for (let s = 0; s < sceneCount; s++) {
  await page.evaluate((i) => document.querySelectorAll('.scene-switch button')[i].click(), s);
  await settle(1500);
  const scene = await page.evaluate(() => window.__lab.store.state.scene);
  if (wanted && !wanted.includes(scene)) continue;
  await set(RESET);
  await snap(`${scene}-overview`, 'the world as it opens');

  const ids = await page.evaluate((sc) => [...window.__lab.stage.get(sc).registry.parts.keys()], scene);
  if (process.env.PARTS !== '0')
    for (const id of ids) {
      await set({ selected: id });
      await snap(`${scene}-${id}-setting`, 'selected, framed by the app');
      await page.evaluate((p) => window.__lab.stage.frameParts([p], 1.35), id);
      await snap(`${scene}-${id}-close`, 'close up');
      await page.evaluate((p) => window.__lab.stage.frameParts([p], 4), id);
      await snap(`${scene}-${id}-mid`, 'mid-distance, with what holds it');
    }

  await set(RESET);
  await page.evaluate(() => window.__lab.stage.frameAll(0));
  for (const [tag, patch, note] of [
    ['exploded', { explode: 1 }, 'exploded: every part leaves along a sensible line, nothing left behind'],
    ['xray', { xray: true }, 'x-ray: the inside reads'],
    ['cut', { cutaway: true }, 'cut, where the world allows it'],
    ['labels', { labels: 'all' }, 'every label: none overlaps, none points at nothing'],
    ['isolated', { selected: ids[0] ?? null, isolate: true }, `isolated: ${ids[0]}`],
  ]) {
    await set({ ...RESET, ...patch });
    await snap(`${scene}-${tag}`, note);
  }
  await set(RESET);

  if (process.env.MODES !== '0') {
    const modes = await page.evaluate(() =>
      [...document.querySelectorAll('.rail button')].map((b) => b.textContent.trim()),
    );
    for (let m = 0; m < modes.length; m++) {
      await page.evaluate((i) => document.querySelectorAll('.rail button')[i].click(), m);
      const label = modes[m]
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .replace(/\W+/g, '-');
      await snap(`${scene}-mode-${label}`, `mode ${modes[m]}`);
    }
    await page.evaluate(() => document.querySelectorAll('.rail button')[0].click());
  }
}
await browser.close();

const head = `# Review walk: ${BASE} at ${WIDTH} px, ${LANG}\n\n${shots.length} screenshots, ${errors.length} console errors.\n`;
const list = shots.map((s) => `- \`${s.file}\` ${s.note}`).join('\n');
const errs = errors.map((e) => `- after \`${e.at}\`: ${e.text}`).join('\n');
fs.writeFileSync(
  path.join(OUT, 'index.md'),
  `${head}\n## Shots\n\n${list}\n\n## Console errors\n\n${errs || 'none'}\n`,
);
fs.writeFileSync(
  path.join(OUT, 'index.json'),
  JSON.stringify({ url: BASE, width: WIDTH, lang: LANG, shots, errors }, null, 2),
);
console.log(`${shots.length} shots, ${errors.length} errors → ${OUT}/index.md`);
