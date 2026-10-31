// Measures the stability of a lab's picture (docs/lab-quality.md §3, « A warm, full and stable picture »): in every world, a
// slow orbit and a slow dolly drawn frame by frame on pinned clocks, the pixels read back after each frame. It reports:
//   shimmer  the share of pixels whose change from frame to frame is not smooth (|L(t+1) − 2 L(t) + L(t−1)| > 12/255):
//            crawling edges, popping texels, z-fighting. A slow, clean move gives almost none.
//   spike    the largest frame-to-frame difference over the median one: a pop (a shadow box changing size, a level of
//            detail switching, something appearing). Over 2 is a defect.
// It judges nothing else: compare the shimmer of a world with its value before a change (it depends on the content).
//
//   npm i --prefix ~/.cache/lab-review puppeteer-core               once (outside every repo)
//   npm run dev                                                      in the lab: dev mode exposes window.__lab
//   URL=http://localhost:5173/ OUT=/some/dir node ~/Dev/lab-kit/tools/review/flicker.mjs
//
//   SCENES=site,ram (default all)   FRAMES=150   WIDTH=1280 HEIGHT=720   GL=metal | swiftshader (default metal)
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

const deps = process.env.LAB_REVIEW_DEPS ?? path.join(os.homedir(), '.cache/lab-review');
const puppeteer = createRequire(path.join(deps, 'index.js'))('puppeteer-core');
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const { URL: BASE, OUT } = process.env;
if (!BASE || !OUT) throw new Error('Set URL (the lab in dev mode) and OUT (where the report goes).');
const W = Number(process.env.WIDTH ?? 1280);
const H = Number(process.env.HEIGHT ?? 720);
const FRAMES = Number(process.env.FRAMES ?? 150);
const GL = {
  metal: ['--use-gl=angle', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
  swiftshader: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
}[process.env.GL ?? 'metal'];
fs.mkdirSync(OUT, { recursive: true });

// what the measure does not look at: the interface around the 3D view
const HIDE = `#app > .topbar, #app > .rail, #app > .panel, #app > .strip, #viewport > .toolbar, #viewport > .peek,
  #viewport > .panel-toggle, #viewport > .narr, #viewport > .dv, #viewport > .label-layer { display: none !important; }
  #viewport { position: fixed !important; inset: 0 !important; }`;

/** Pinned clocks: animation frames and time only move when the tool says so (`window.__step()`), 30 frames a second. */
function pinClocks() {
  let now = 0;
  let queue = new Map();
  let id = 0;
  performance.now = () => now;
  const RealDate = Date;
  const epoch = RealDate.UTC(2026, 5, 21, 10, 0, 0);
  window.Date = class extends RealDate {
    constructor(...a) {
      if (a.length) super(...a);
      else super(epoch + now);
    }
    static now() {
      return epoch + now;
    }
  };
  window.requestAnimationFrame = (cb) => (queue.set(++id, cb), id);
  window.cancelAnimationFrame = (k) => void queue.delete(k);
  let seed = 42;
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  window.__step = (n = 1) => {
    for (let i = 0; i < n; i++) {
      now += 1000 / 30;
      const q = queue;
      queue = new Map();
      for (const cb of q.values()) cb(now);
    }
  };
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  protocolTimeout: 0,
  args: [...GL, '--hide-scrollbars', '--mute-audio'],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
await page.evaluateOnNewDocument((css) => {
  const add = () => {
    const s = document.createElement('style');
    s.textContent = css;
    document.head.append(s);
  };
  if (document.head) add();
  else document.addEventListener('DOMContentLoaded', add);
}, HIDE);
await page.evaluateOnNewDocument(pinClocks);
await page.goto(BASE, { waitUntil: 'load', timeout: 180000 });
for (let i = 0; i < 900 && !(await page.evaluate(() => !!window.__lab?.stage)); i++)
  await new Promise((r) => setTimeout(r, 100));
if (!(await page.evaluate(() => !!window.__lab?.stage)))
  throw new Error('window.__lab is not there: run the lab in dev mode.');
await page.evaluate(() => {
  const st = window.__lab.stage;
  st.outline.enabled = false;
  st.outlineHover.enabled = false;
  window.__lab.store.set({ labels: 'none', panelOpen: false });
  st.setViewInsets({ top: 0, right: 0, bottom: 0, left: 0 }, false);
  document.querySelector('.narr-invite__x')?.click();
  window.__step(10);
});

/** One move of FRAMES frames, measured in the page (the pixels never leave it). */
const measure = (move) =>
  page.evaluate(
    (move, frames) => {
      const st = window.__lab.stage;
      const c = st.controls;
      c.minDistance = 0;
      c.maxDistance = Infinity;
      c.minPolarAngle = 0;
      c.maxPolarAngle = Math.PI;
      const p0 = st.camera.position.clone();
      const t0 = c.target.clone();
      const ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);
      const place = (u) => {
        const e = ease(u);
        const rel = p0.clone().sub(t0);
        if (move === 'orbit') rel.applyAxisAngle(st.camera.up, (5 * Math.PI * e) / 180);
        else rel.multiplyScalar(Math.pow(0.8, e));
        st.fly = null;
        st.camera.position.copy(t0).add(rel);
        c.target.copy(t0);
        c.update();
      };
      const gl = st.renderer.getContext();
      const w = gl.drawingBufferWidth;
      const h = gl.drawingBufferHeight;
      const px = new Uint8Array(w * h * 4);
      let l0 = null;
      let l1 = null;
      const d1 = [];
      let shimmer = 0;
      let counted = 0;
      place(0);
      window.__step(6);
      for (let f = 0; f < frames; f++) {
        place(f / (frames - 1));
        window.__step(1);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
        const l = new Float32Array(w * h);
        for (let i = 0, k = 0; i < l.length; i++, k += 4)
          l[i] = 0.2126 * px[k] + 0.7152 * px[k + 1] + 0.0722 * px[k + 2];
        if (l1) {
          let s = 0;
          for (let i = 0; i < l.length; i++) s += Math.abs(l[i] - l1[i]);
          d1.push(s / l.length);
        }
        if (l0 && l1) {
          let n = 0;
          for (let i = 0; i < l.length; i++) if (Math.abs(l[i] - 2 * l1[i] + l0[i]) > 12) n++;
          shimmer += n / l.length;
          counted++;
        }
        l0 = l1;
        l1 = l;
      }
      st.camera.position.copy(p0);
      c.target.copy(t0);
      c.update();
      const sorted = [...d1].sort((a, b) => a - b);
      const median = sorted[sorted.length >> 1] || 1e-6;
      const max = Math.max(...d1);
      return {
        shimmerPct: +((100 * shimmer) / Math.max(1, counted)).toFixed(3),
        spike: +(max / median).toFixed(2),
        spikeFrame: d1.indexOf(max) + 1,
        medianDiff: +median.toFixed(3),
        buffer: [w, h],
      };
    },
    move,
    FRAMES,
  );

const count = await page.evaluate(() => document.querySelectorAll('.scene-switch button').length);
const wanted = process.env.SCENES?.split(',');
const rows = [];
for (let s = 0; s < Math.max(1, count); s++) {
  if (count) await page.evaluate((i) => document.querySelectorAll('.scene-switch button')[i].click(), s);
  await page.evaluate(() => window.__step(40));
  const scene = await page.evaluate(() => window.__lab.store.state.scene);
  if (wanted && !wanted.includes(scene)) continue;
  await page.evaluate(() => {
    window.__lab.store.set({ selected: null, labels: 'none' });
    window.__lab.stage.frameAll(0.01);
    window.__step(20);
  });
  await page.screenshot({ path: path.join(OUT, `${scene}.png`) });
  for (const move of ['orbit', 'dolly']) {
    const r = await measure(move);
    rows.push({ scene, move, ...r });
    console.log(`${scene} ${move}: shimmer ${r.shimmerPct} %, spike ${r.spike} (frame ${r.spikeFrame})`);
  }
}
await browser.close();

const md = [
  `# Picture stability: ${BASE}`,
  '',
  `${W}×${H}, ${FRAMES} frames per move (orbit: 5° around the overview's target; dolly: 20 % closer), clocks pinned at 30 fps.`,
  '',
  '| World | Move | Shimmer (% of pixels) | Spike (max / median frame difference) | at frame |',
  '| --- | --- | --- | --- | --- |',
  ...rows.map(
    (r) =>
      `| ${r.scene} | ${r.move} | ${r.shimmerPct} | ${r.spike}${r.spike > 2 ? ' **pop**' : ''} | ${r.spikeFrame} |`,
  ),
  '',
  errors.length ? `Page errors:\n\n${errors.map((e) => `- ${e}`).join('\n')}` : 'No page error.',
  '',
].join('\n');
fs.writeFileSync(path.join(OUT, 'flicker.md'), md);
fs.writeFileSync(
  path.join(OUT, 'flicker.json'),
  JSON.stringify({ url: BASE, width: W, height: H, frames: FRAMES, rows, errors }, null, 2),
);
console.log(`→ ${OUT}/flicker.md`);
