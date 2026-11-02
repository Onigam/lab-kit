import { h } from './dom';
import { onThemeChange } from './theme';

// Small canvas charts with a crosshair tooltip. One y-axis per chart (no dual axes);
// several measures are shown as small multiples instead.

export const SERIES_COLORS = {
  hydro: '#2a7fb8',
  pv: '#c99700',
  load: '#6b4fd8',
  dump: '#c4692c',
};

/** The frame's colours for a canvas, read from the stylesheet (a canvas cannot use `var()`), once per theme. */
let palette: Record<string, string> | null = null;
onThemeChange(() => (palette = null));

function colours(): Record<string, string> {
  if (palette) return palette;
  const css = typeof getComputedStyle === 'function' ? getComputedStyle(document.documentElement) : null;
  const read = (name: string, light: string) => css?.getPropertyValue(name).trim() || light;
  palette = {
    ink: read('--ink', '#12202b'),
    ink2: read('--ink-2', '#425160'),
    grid: read('--line', 'rgb(18 32 43 / 0.16)'),
    mark: read('--line-2', 'rgb(18 32 43 / 0.32)'),
    surface: read('--card', '#f8f9f6'),
    [SERIES_COLORS.hydro]: read('--water', SERIES_COLORS.hydro),
    [SERIES_COLORS.pv]: read('--sun', SERIES_COLORS.pv),
    [SERIES_COLORS.load]: read('--violet', SERIES_COLORS.load),
    [SERIES_COLORS.dump]: read('--copper', SERIES_COLORS.dump),
  };
  return palette;
}

/** A series colour on the current theme: the shared four follow the frame, a lab's own colour stays as it is. */
const tone = (color: string): string => colours()[color] ?? color;

export interface SeriesDef {
  key: string;
  label: () => string;
  color: string;
  /** Dashed stroke (secondary series). */
  dash?: boolean;
  /** Thicker stroke (highlighted series). */
  bold?: boolean;
}

/**
 * A mark on a chart at abscissa `x`. As before when only `x`, `y`, `label` and `color` are given: with a `y`, a dot with its label; without, a vertical line
 * with its label at the top. The rest says what to draw when that is not it: a label alone, a line alone, a side.
 */
export interface ChartMarker {
  x: number;
  y?: number;
  label?: string;
  color?: string;
  /** Draw the vertical line (default: when there is no `y`). */
  line?: boolean;
  /** Draw the dot at `y` (default: when there is a `y`). */
  dot?: boolean;
  /** Which side of the point the label is on: `start`, after it, `end`, before it (default: `end` past 70 % of the width). */
  align?: 'start' | 'end';
}

interface ChartOpts {
  height: number;
  series: SeriesDef[];
  yMin?: number;
  yMax?: number;
  yFmt: (v: number) => string;
  xFmt: (v: number) => string;
  /** Show a legend row (always when ≥ 2 series). */
  legend?: boolean;
  /** Vertical reference lines and points drawn over the series. */
  markers?: () => ChartMarker[];
}

function setupCanvas(canvas: HTMLCanvasElement, w: number, hgt: number): CanvasRenderingContext2D {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(hgt * dpr);
  // the width follows the container (the stylesheet says 100%), so a narrower panel narrows the chart too
  canvas.style.height = `${hgt}px`;
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

/** Draw a chart again when its container changes width (a panel dragged narrower, a rotation, a resized window). */
function redrawOnResize(el: HTMLElement, draw: () => void): void {
  let width = 0;
  new ResizeObserver(() => {
    const w = el.clientWidth;
    if (w > 0 && Math.abs(w - width) > 0.5) {
      width = w;
      draw();
    }
  }).observe(el);
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (v <= m * p) return m * p;
  return 10 * p;
}

export class LineChart {
  readonly el: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private tip: HTMLDivElement;
  private legendEl: HTMLDivElement | null = null;
  private xs: number[] = [];
  private ys: Record<string, number[]> = {};
  private hover: number | null = null;

  constructor(private opts: ChartOpts) {
    this.canvas = h('canvas', { class: 'chart__canvas', role: 'img' });
    this.tip = h('div', { class: 'chart__tip' });
    this.el = h('div', { class: 'chart' }, this.canvas, this.tip);
    if (opts.legend ?? opts.series.length > 1) {
      this.legendEl = h('div', { class: 'chart__legend' });
      this.el.prepend(this.legendEl);
    }
    this.canvas.addEventListener('pointermove', (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.hover = e.clientX - r.left;
      this.draw();
    });
    this.canvas.addEventListener('pointerleave', () => {
      this.hover = null;
      this.draw();
    });
    redrawOnResize(this.el, () => this.draw());
  }

  setData(xs: number[], ys: Record<string, number[]>): void {
    this.xs = xs;
    this.ys = ys;
  }

  draw(): void {
    const w = this.el.clientWidth || 300;
    const H = this.opts.height;
    const ctx = setupCanvas(this.canvas, w, H);
    const { ink: INK, ink2: INK_2, grid: GRID, mark: MARK, surface: SURFACE } = colours();
    const pad = { l: 42, r: 10, t: 8, b: 18 };
    const pw = w - pad.l - pad.r;
    const ph = H - pad.t - pad.b;
    ctx.clearRect(0, 0, w, H);

    if (this.legendEl) {
      this.legendEl.replaceChildren(
        ...this.opts.series.map((s) =>
          h(
            'span',
            { class: 'chart__key' },
            h('i', {
              style: s.dash ? `border-top:2px dashed ${tone(s.color)};background:none` : `background:${tone(s.color)}`,
            }),
            s.label(),
          ),
        ),
      );
    }
    this.canvas.setAttribute('aria-label', this.opts.series.map((s) => s.label()).join(', '));

    const n = this.xs.length;
    let yMax = this.opts.yMax ?? 0;
    if (this.opts.yMax === undefined) {
      for (const s of this.opts.series)
        for (const v of this.ys[s.key] ?? []) if (Number.isFinite(v)) yMax = Math.max(yMax, v);
      yMax = niceMax(yMax * 1.05);
    }
    const yMin = this.opts.yMin ?? 0;
    const x0 = n ? this.xs[0] : 0;
    const x1 = n ? this.xs[n - 1] : 1;
    const X = (x: number) => pad.l + ((x - x0) / Math.max(1e-9, x1 - x0)) * pw;
    const Y = (y: number) => pad.t + ph - ((y - yMin) / Math.max(1e-9, yMax - yMin)) * ph;

    // grid + y labels (recessive)
    ctx.font = '10px "JetBrains Mono", ui-monospace, monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    for (let k = 0; k <= 3; k++) {
      const v = yMin + ((yMax - yMin) * k) / 3;
      const y = Y(v);
      ctx.strokeStyle = GRID;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();
      ctx.fillStyle = INK_2;
      ctx.fillText(this.opts.yFmt(v), pad.l - 6, y);
    }
    if (n) {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(this.opts.xFmt(x0), pad.l, H - 14);
      ctx.textAlign = 'right';
      ctx.fillText(this.opts.xFmt(x1), w - pad.r, H - 14);
    }
    if (n < 2) return;

    // series: 2px lines with rounded joins
    for (const s of this.opts.series) {
      const ys = this.ys[s.key] ?? [];
      ctx.strokeStyle = tone(s.color);
      ctx.lineWidth = s.bold ? 3 : 2;
      ctx.setLineDash(s.dash ? [5, 4] : []);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      let pen = false;
      ys.forEach((v, i) => {
        if (!Number.isFinite(v)) {
          pen = false;
          return;
        }
        if (pen) ctx.lineTo(X(this.xs[i]), Y(v));
        else ctx.moveTo(X(this.xs[i]), Y(v));
        pen = true;
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // reference markers (available flow, operating point…)
    for (const m of this.opts.markers?.() ?? []) {
      if (m.x < x0 || m.x > x1) continue;
      const mx = X(m.x);
      const hasY = m.y !== undefined && Number.isFinite(m.y);
      const before = m.align ? m.align === 'end' : mx > w * 0.7;
      const label = m.label ?? '';
      ctx.save();
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = MARK;
      ctx.lineWidth = 1;
      if (m.line ?? m.y === undefined) {
        ctx.beginPath();
        ctx.moveTo(mx, pad.t);
        ctx.lineTo(mx, pad.t + ph);
        ctx.stroke();
      }
      ctx.restore();
      ctx.font = '10px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = INK_2;
      ctx.textAlign = before ? 'right' : 'left';
      ctx.textBaseline = 'top';
      if (hasY) {
        const my = Y(Math.min(m.y!, yMax));
        if (m.dot ?? true) {
          ctx.fillStyle = SURFACE;
          ctx.beginPath();
          ctx.arc(mx, my, 6.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = tone(m.color ?? SERIES_COLORS.dump);
          ctx.beginPath();
          ctx.arc(mx, my, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = INK;
        ctx.fillText(label, mx + (before ? -8 : 8), my + 5);
      } else {
        ctx.fillText(label, mx + (before ? -4 : 4), pad.t + 2);
      }
    }

    // crosshair + tooltip
    if (this.hover !== null && this.hover > pad.l) {
      const xv = x0 + ((this.hover - pad.l) / pw) * (x1 - x0);
      let i = 0;
      let best = Infinity;
      this.xs.forEach((x, k) => {
        const d = Math.abs(x - xv);
        if (d < best) {
          best = d;
          i = k;
        }
      });
      const cx = X(this.xs[i]);
      ctx.strokeStyle = MARK;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, pad.t);
      ctx.lineTo(cx, pad.t + ph);
      ctx.stroke();
      for (const s of this.opts.series) {
        const v = this.ys[s.key]?.[i];
        if (v === undefined || !Number.isFinite(v)) continue;
        ctx.fillStyle = SURFACE;
        ctx.beginPath();
        ctx.arc(cx, Y(v), 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = tone(s.color);
        ctx.beginPath();
        ctx.arc(cx, Y(v), 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      this.tip.replaceChildren(
        h('div', { class: 'chart__tip-x' }, this.opts.xFmt(this.xs[i])),
        ...this.opts.series.map((s) =>
          h(
            'div',
            { class: 'chart__tip-row' },
            h('i', { style: `background:${tone(s.color)}` }),
            h('b', {}, Number.isFinite(this.ys[s.key]?.[i]) ? this.opts.yFmt(this.ys[s.key][i]) : '—'),
            h('span', {}, s.label()),
          ),
        ),
      );
      this.tip.style.display = 'block';
      const left = Math.min(w - 150, Math.max(0, cx + 10));
      this.tip.style.left = `${left}px`;
    } else {
      this.tip.style.display = 'none';
    }
    ctx.fillStyle = INK;
  }
}

/** Power vs speed curve of the runner with the operating point and the optimum. */
export class CurveChart {
  readonly el: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private data: [number, number][] = [];
  private point: [number, number] = [0, 0];
  constructor(
    private height: number,
    private labels: { optimum: () => string; operating: () => string },
  ) {
    this.canvas = h('canvas', { class: 'chart__canvas', role: 'img' });
    this.el = h('div', { class: 'chart' }, this.canvas);
    redrawOnResize(this.el, () => this.draw());
  }

  set(data: [number, number][], point: [number, number]): void {
    this.data = data;
    this.point = point;
  }

  draw(): void {
    const w = this.el.clientWidth || 300;
    const H = this.height;
    const ctx = setupCanvas(this.canvas, w, H);
    const { ink: INK, ink2: INK_2, grid: GRID, mark: MARK, surface: SURFACE } = colours();
    const pad = { l: 42, r: 12, t: 12, b: 20 };
    const pw = w - pad.l - pad.r;
    const ph = H - pad.t - pad.b;
    ctx.clearRect(0, 0, w, H);
    if (this.data.length < 2) {
      ctx.fillStyle = INK_2;
      ctx.font = '12px "Space Grotesk", sans-serif';
      ctx.fillText('—', pad.l, H / 2);
      return;
    }
    const xMax = this.data[this.data.length - 1][0];
    const yMax = niceMax(Math.max(...this.data.map((d) => d[1])) * 1.1);
    const X = (x: number) => pad.l + (x / xMax) * pw;
    const Y = (y: number) => pad.t + ph - (y / yMax) * ph;
    ctx.font = '10px "JetBrains Mono", ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let k = 0; k <= 3; k++) {
      const v = (yMax * k) / 3;
      ctx.strokeStyle = GRID;
      ctx.beginPath();
      ctx.moveTo(pad.l, Y(v));
      ctx.lineTo(w - pad.r, Y(v));
      ctx.stroke();
      ctx.fillStyle = INK_2;
      ctx.fillText(`${Math.round(v)} W`, pad.l - 6, Y(v));
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('0', pad.l, H - 14);
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(xMax)} tr/min`, w - pad.r, H - 14);

    ctx.strokeStyle = tone(SERIES_COLORS.hydro);
    ctx.lineWidth = 2;
    ctx.beginPath();
    this.data.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
    ctx.stroke();

    // optimum marker
    const opt = this.data.reduce((a, b) => (b[1] > a[1] ? b : a));
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = MARK;
    ctx.beginPath();
    ctx.moveTo(X(opt[0]), Y(opt[1]));
    ctx.lineTo(X(opt[0]), pad.t + ph);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = INK_2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(this.labels.optimum(), X(opt[0]), Y(opt[1]) - 4);

    // operating point (ringed so it separates from the curve)
    const [px, py] = this.point;
    if (px > 0) {
      const cx = X(Math.min(px, xMax));
      const cy = Y(Math.min(py, yMax));
      ctx.fillStyle = SURFACE;
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = tone(SERIES_COLORS.dump);
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = INK;
      ctx.textAlign = cx > w * 0.7 ? 'right' : 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(this.labels.operating(), cx + (cx > w * 0.7 ? -9 : 9), cy + 6);
    }
  }
}
