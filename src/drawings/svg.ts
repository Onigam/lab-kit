import { tr, type L } from '../i18n';

// Tiny technical-drawing kit producing SVG on an A3 sheet (420 × 297 paper mm).
// Paper space: millimetres, origin top-left, Y down. A `View` maps model millimetres
// (Y up) onto the paper with a scale, so parts are drawn with their real dimensions and
// dimension lines read the real values.

export type Pt = [number, number];
export type Text = string | L;

export const PAPER = { w: 420, h: 297, margin: 10 };

export const INK = '#1d2b3a';
export const INK_2 = '#5b6878';
export const COLORS = {
  ink: INK,
  muted: INK_2,
  water: '#2a7fb8',
  waterFill: '#d7e9f4',
  dcPos: '#c0261f',
  dcNeg: INK,
  acL: '#7a4a1f',
  acN: '#1d5fb5',
  pe: '#6b8f1a',
  signal: '#6b4fd8',
  /** Safety / protection elements (jet deflectors, protective devices). */
  accent: '#6b4fd8',
  red: '#c0261f',
  copper: '#b8692e',
  paper: '#fbf8f2',
};

/** Line weights (paper mm), close to ISO 128: thick outlines, thin details. */
export const W = { thick: 0.5, medium: 0.35, thin: 0.18 };

export type HatchKind = 'steel' | 'alu' | 'plastic' | 'rubber' | 'wood' | 'earth' | 'water' | 'copper' | 'pmma';

export interface Stroke {
  /** Paper-mm width (default thick for shapes, thin for details). */
  w?: number;
  color?: string;
  /** 'center' dash-dot, 'hidden' dashed, 'phantom' long dash-double-dot, or a custom array (paper mm). */
  dash?: 'center' | 'hidden' | 'phantom' | number[];
  fill?: string;
  /** Section hatching (adds a pattern fill on top of `fill`). */
  hatch?: HatchKind;
  opacity?: number;
}

export interface TextOpts {
  /** Cap height in paper mm (default 2.5). */
  size?: number;
  anchor?: 'start' | 'middle' | 'end';
  weight?: 'normal' | 'bold';
  /** Degrees, counter-clockwise like the model. */
  rotate?: number;
  color?: string;
  mono?: boolean;
  italic?: boolean;
  /** Vertical alignment relative to the point. */
  baseline?: 'top' | 'middle' | 'bottom';
  /** White halo behind the text so it reads over lines. */
  halo?: boolean;
}

const NS = 'http://www.w3.org/2000/svg';
const DASH: Record<string, number[]> = {
  center: [6, 1.2, 0.6, 1.2],
  hidden: [2.2, 1.2],
  phantom: [8, 1.2, 0.6, 1.2, 0.6, 1.2],
};

function el<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number | undefined>,
): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined) e.setAttribute(k, String(v));
  return e;
}

const fmtNum = (v: number) => (Math.abs(v) >= 10 || Number.isInteger(v) ? String(Math.round(v)) : v.toFixed(1));

/** Format a model length for a dimension (mm). */
export function fmt(v: number): string {
  return fmtNum(Math.round(v * 10) / 10);
}

function hatchDefs(defs: SVGDefsElement): void {
  const pat = (id: string, size: number, draw: (g: SVGGElement) => void, rotate = 45) => {
    const p = el('pattern', {
      id,
      patternUnits: 'userSpaceOnUse',
      width: size,
      height: size,
      patternTransform: `rotate(${rotate})`,
    });
    const g = el('g', {});
    draw(g);
    p.append(g);
    defs.append(p);
  };
  const ln = (g: SVGGElement, x1: number, y1: number, x2: number, y2: number, color = INK, w = 0.15) =>
    g.append(el('line', { x1, y1, x2, y2, stroke: color, 'stroke-width': w }));
  pat('h-steel', 1.6, (g) => ln(g, 0, 0, 0, 1.6));
  pat('h-alu', 1.6, (g) => {
    ln(g, 0, 0, 0, 1.6);
    ln(g, 0.8, 0, 0.8, 1.6, INK, 0.08);
  });
  pat(
    'h-plastic',
    2.4,
    (g) => {
      ln(g, 0, 0, 0, 2.4);
      ln(g, 1.2, 0, 1.2, 2.4, INK, 0.1);
    },
    -45,
  );
  pat('h-rubber', 0.9, (g) => ln(g, 0, 0, 0, 0.9, INK, 0.25));
  pat('h-copper', 1.2, (g) => {
    ln(g, 0, 0, 0, 1.2, COLORS.copper, 0.25);
  });
  pat(
    'h-wood',
    3,
    (g) => {
      ln(g, 0, 0, 0, 3, '#8a6a4f', 0.15);
      ln(g, 1.5, 0, 1.5, 3, '#8a6a4f', 0.08);
    },
    10,
  );
  pat('h-pmma', 3, (g) => ln(g, 0, 0, 0, 3, COLORS.water, 0.12), 60);
  pat(
    'h-earth',
    3,
    (g) => {
      g.append(el('circle', { cx: 0.7, cy: 0.8, r: 0.22, fill: '#8a6a4f' }));
      g.append(el('circle', { cx: 2.1, cy: 2.2, r: 0.16, fill: '#8a6a4f' }));
      ln(g, 1.6, 0.4, 2.4, 0.4, '#8a6a4f', 0.12);
    },
    0,
  );
  pat('h-water', 2.5, (g) => ln(g, 0, 1.2, 1.6, 1.2, COLORS.water, 0.18), 0);
}

/** One A3 drawing sheet. */
/** Lab-wide texts of the title block (project name, disclaimer, default drawing date). */
export interface DrawingProject {
  project: Text;
  disclaimer: Text;
  /** Default date shown in the title block, e.g. '2026-10-22'. */
  date: string;
}

let project: DrawingProject = {
  project: { fr: 'LAB', en: 'LAB' },
  disclaimer: {
    fr: 'Exemple pédagogique — cotes indicatives, à vérifier avant fabrication',
    en: 'Educational example — indicative dimensions, check before manufacturing',
  },
  date: new Date().toISOString().slice(0, 10),
};

/** Set the title-block texts used by every sheet of this lab. */
export function configureDrawings(p: Partial<DrawingProject>): void {
  project = { ...project, ...p };
}

export class Drawing {
  readonly svg: SVGSVGElement;
  /** Layers: content under annotations. */
  readonly content: SVGGElement;
  readonly notes: SVGGElement;

  constructor() {
    this.svg = el('svg', {
      xmlns: NS,
      viewBox: `0 0 ${PAPER.w} ${PAPER.h}`,
      width: `${PAPER.w}mm`,
      height: `${PAPER.h}mm`,
      'font-family': "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif",
    });
    const defs = el('defs', {});
    hatchDefs(defs);
    const arrow = el('marker', {
      id: 'arrow',
      viewBox: '0 0 10 10',
      refX: 10,
      refY: 5,
      markerWidth: 2.8,
      markerHeight: 2.8,
      orient: 'auto-start-reverse',
      markerUnits: 'userSpaceOnUse',
    });
    arrow.append(el('path', { d: 'M0,1.5 L10,5 L0,8.5 z', fill: INK }));
    defs.append(arrow);
    this.svg.append(defs);
    this.svg.append(el('rect', { x: 0, y: 0, width: PAPER.w, height: PAPER.h, fill: COLORS.paper }));
    this.content = el('g', {});
    this.notes = el('g', {});
    this.svg.append(this.content, this.notes);
  }

  /** Model view: model mm (Y up) mapped to paper mm with `scale` (e.g. 1/5), origin at paper (x, y). */
  view(x: number, y: number, scale: number): View {
    return new View(this, this.content, x, y, scale);
  }

  /** Paper-space view (1:1, Y down) for diagrams, tables and notes. */
  paper(): View {
    return new View(this, this.notes, 0, 0, 1, true);
  }

  /** Border frame, zone marks and title block. */
  frame(tb: TitleBlock): void {
    const p = this.paper();
    const m = PAPER.margin;
    p.rect([m, m], [PAPER.w - m, PAPER.h - m], { w: W.thick });
    p.rect([m - 3, m - 3], [PAPER.w - m + 3, PAPER.h - m + 3], { w: W.thin });
    // zone marks
    for (let i = 1; i < 8; i++) {
      const x = m + ((PAPER.w - 2 * m) * i) / 8;
      p.line([x, m - 3], [x, m], { w: W.thin });
      p.line([x, PAPER.h - m], [x, PAPER.h - m + 3], { w: W.thin });
    }
    // title block bottom-right
    const bw = 178;
    const bh = 38;
    const x0 = PAPER.w - m - bw;
    const y0 = PAPER.h - m - bh;
    p.rect([x0, y0], [x0 + bw, y0 + bh], { w: W.thick, fill: COLORS.paper });
    p.line([x0, y0 + 14], [x0 + bw, y0 + 14], { w: W.thin });
    p.line([x0, y0 + 24], [x0 + bw, y0 + 24], { w: W.thin });
    for (const cx of [x0 + 52, x0 + 92, x0 + 128]) p.line([cx, y0 + 24], [cx, y0 + bh], { w: W.thin });
    p.text([x0 + 3, y0 + 3.5], tb.title, { size: 5, weight: 'bold', baseline: 'top' });
    if (tb.subtitle) p.text([x0 + 3, y0 + 10.2], tb.subtitle, { size: 2.3, color: INK_2, baseline: 'top' });
    p.text([x0 + 3, y0 + 16.5], project.project, { size: 2.4, weight: 'bold', baseline: 'top' });
    p.text([x0 + 3, y0 + 20.4], project.disclaimer, { size: 2, color: COLORS.red, baseline: 'top' });
    const cell = (x: number, label: Text, value: Text) => {
      p.text([x + 2, y0 + 26.5], label, { size: 1.8, color: INK_2, baseline: 'top' });
      p.text([x + 2, y0 + 31], value, { size: 3, weight: 'bold', baseline: 'top', mono: true });
    };
    cell(x0, { fr: 'N° de plan', en: 'Drawing no.' }, tb.number);
    cell(x0 + 52, { fr: 'Échelle', en: 'Scale' }, tb.scale);
    cell(x0 + 92, { fr: 'Format · Rév.', en: 'Size · Rev.' }, `A3 · ${tb.rev ?? 'A'}`);
    cell(x0 + 128, { fr: 'Date', en: 'Date' }, tb.date ?? project.date);
    // projection symbol (first angle, European)
    const sx = x0 - 22;
    const sy = y0 + bh - 12;
    p.text([sx, sy - 4], { fr: 'Projection européenne', en: 'First-angle projection' }, { size: 1.6, color: INK_2 });
    p.circle([sx + 13, sy + 4], 2.5, { w: W.thin });
    p.circle([sx + 13, sy + 4], 1, { w: W.thin });
    p.polyline(
      [
        [sx + 1, sy + 1.5],
        [sx + 8, sy + 0.5],
        [sx + 8, sy + 7.5],
        [sx + 1, sy + 6.5],
      ],
      { w: W.thin, closed: true },
    );
  }

  /** Simple table in paper space. Returns its height. */
  table(
    x: number,
    y: number,
    cols: { label: Text; w: number; align?: 'start' | 'middle' | 'end' }[],
    rows: Text[][],
    rowH = 5.2,
  ): number {
    const p = this.paper();
    const total = cols.reduce((a, c) => a + c.w, 0);
    const h = rowH * (rows.length + 1);
    p.rect([x, y], [x + total, y + h], { w: W.medium, fill: COLORS.paper });
    p.rect([x, y], [x + total, y + rowH], { w: W.thin, fill: '#efe6d3' });
    let cx = x;
    cols.forEach((c, i) => {
      if (i) p.line([cx, y], [cx, y + h], { w: W.thin });
      p.text([cx + 1.5, y + rowH / 2], c.label, { size: 2, weight: 'bold', baseline: 'middle' });
      cx += c.w;
    });
    rows.forEach((r, ri) => {
      const ry = y + rowH * (ri + 1);
      p.line([x, ry], [x + total, ry], { w: W.thin });
      let rx = x;
      r.forEach((v, ci) => {
        const c = cols[ci];
        const align = c.align ?? 'start';
        const tx = align === 'start' ? rx + 1.5 : align === 'end' ? rx + c.w - 1.5 : rx + c.w / 2;
        p.text([tx, ry + rowH / 2], v, { size: 2, baseline: 'middle', anchor: align, mono: ci > 0 });
        rx += c.w;
      });
    });
    return h;
  }

  /** Serialise to a standalone SVG file. */
  serialize(): string {
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(this.svg);
  }
}

export interface TitleBlock {
  title: Text;
  subtitle?: Text;
  number: string;
  scale: string;
  rev?: string;
  date?: string;
}

/** Drawing primitives in model coordinates (or paper coordinates for a paper view). */
export class View {
  constructor(
    readonly drawing: Drawing,
    private layer: SVGGElement,
    readonly ox: number,
    readonly oy: number,
    readonly scale: number,
    private paperSpace = false,
  ) {}

  /**
   * Paper-space sub-view drawn in a transformed group (symbols): local origin at `at`
   * (paper mm), rotated by `rotate` degrees (counter-clockwise) and scaled.
   */
  group(at: Pt, rotate = 0, scale = 1): View {
    const [x, y] = this.map(at);
    const g = el('g', { transform: `translate(${x} ${y}) rotate(${-rotate}) scale(${scale})` });
    this.layer.append(g);
    return new View(this.drawing, g, 0, 0, 1, true);
  }

  /** Model point -> paper point. */
  map([x, y]: Pt): Pt {
    return this.paperSpace ? [x, y] : [this.ox + x * this.scale, this.oy - y * this.scale];
  }

  /** A view translated in model units (e.g. to place a sub-view or a symbol). */
  offset(dx: number, dy: number): View {
    const [px, py] = this.map([dx, dy]);
    return new View(this.drawing, this.layer, px, py, this.scale, false);
  }

  private style(e: SVGElement, s: Stroke, defW: number, defFill = 'none'): SVGElement {
    e.setAttribute('stroke', s.color ?? INK);
    e.setAttribute('stroke-width', String(s.w ?? defW));
    e.setAttribute('stroke-linejoin', 'round');
    e.setAttribute('stroke-linecap', 'round');
    e.setAttribute('fill', s.fill ?? defFill);
    if (s.opacity !== undefined) e.setAttribute('opacity', String(s.opacity));
    if (s.dash) {
      const d = typeof s.dash === 'string' ? DASH[s.dash] : s.dash;
      e.setAttribute('stroke-dasharray', d.join(' '));
    }
    return e;
  }

  private add(e: SVGElement, s: Stroke, defW: number, defFill = 'none'): SVGElement {
    this.layer.append(this.style(e, s, defW, defFill));
    if (s.hatch) {
      // second copy with the hatch pattern and no stroke
      const h = e.cloneNode() as SVGElement;
      h.setAttribute('fill', `url(#h-${s.hatch})`);
      h.setAttribute('stroke', 'none');
      h.removeAttribute('stroke-dasharray');
      this.layer.append(h);
    }
    return e;
  }

  line(a: Pt, b: Pt, s: Stroke = {}): SVGElement {
    const [x1, y1] = this.map(a);
    const [x2, y2] = this.map(b);
    return this.add(el('line', { x1, y1, x2, y2 }), s, W.thick);
  }

  polyline(pts: Pt[], s: Stroke & { closed?: boolean } = {}): SVGElement {
    const d = pts
      .map((p) =>
        this.map(p)
          .map((v) => v.toFixed(3))
          .join(','),
      )
      .join(' ');
    return this.add(el(s.closed ? 'polygon' : 'polyline', { points: d }), s, W.thick);
  }

  /** Axis-aligned rectangle given two opposite corners. */
  rect(a: Pt, b: Pt, s: Stroke = {}): SVGElement {
    const [x1, y1] = this.map(a);
    const [x2, y2] = this.map(b);
    return this.add(
      el('rect', { x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) }),
      s,
      W.thick,
    );
  }

  /** Rectangle with rounded corners (radius in model units). */
  roundRect(a: Pt, b: Pt, r: number, s: Stroke = {}): SVGElement {
    const [x1, y1] = this.map(a);
    const [x2, y2] = this.map(b);
    const rr = r * (this.paperSpace ? 1 : this.scale);
    return this.add(
      el('rect', {
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width: Math.abs(x2 - x1),
        height: Math.abs(y2 - y1),
        rx: rr,
      }),
      s,
      W.thick,
    );
  }

  circle(c: Pt, r: number, s: Stroke = {}): SVGElement {
    const [cx, cy] = this.map(c);
    return this.add(el('circle', { cx, cy, r: r * (this.paperSpace ? 1 : this.scale) }), s, W.thick);
  }

  /** Arc from a0 to a1 (degrees, counter-clockwise in the model, 0 = +X). */
  arc(c: Pt, r: number, a0: number, a1: number, s: Stroke = {}): SVGElement {
    const pts: Pt[] = [];
    const n = Math.max(6, Math.ceil(Math.abs(a1 - a0) / 4));
    for (let i = 0; i <= n; i++) {
      const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
      pts.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a) * (this.paperSpace ? -1 : 1)]);
    }
    return this.polyline(pts, s);
  }

  /** Raw SVG path in paper coordinates of this view's origin (for complex symbols). */
  pathPaper(d: string, s: Stroke = {}): SVGElement {
    const g = el('path', { d, transform: `translate(${this.ox} ${this.oy})` });
    return this.add(g, s, W.medium);
  }

  /** Thin dash-dot centre line, extended `over` model units beyond both ends. */
  center(a: Pt, b: Pt, over = 0): SVGElement {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const ux = (dx / len) * over;
    const uy = (dy / len) * over;
    return this.line([a[0] - ux, a[1] - uy], [b[0] + ux, b[1] + uy], { w: W.thin, dash: 'center', color: INK_2 });
  }

  text(p: Pt, str: Text, o: TextOpts = {}): SVGElement {
    const [x, y] = this.map(p);
    const size = o.size ?? 2.5;
    const t = el('text', {
      x,
      y,
      'font-size': size * 1.4,
      'text-anchor': o.anchor ?? 'start',
      'dominant-baseline': o.baseline === 'top' ? 'hanging' : o.baseline === 'middle' ? 'central' : 'alphabetic',
      fill: o.color ?? INK,
      'font-weight': o.weight === 'bold' ? 700 : 400,
      'font-style': o.italic ? 'italic' : undefined,
      'font-family': o.mono ? "'JetBrains Mono', ui-monospace, monospace" : undefined,
      transform: o.rotate ? `rotate(${-o.rotate} ${x} ${y})` : undefined,
    });
    if (o.halo) {
      t.setAttribute('paint-order', 'stroke');
      t.setAttribute('stroke', COLORS.paper);
      t.setAttribute('stroke-width', String(size * 0.6));
      t.setAttribute('stroke-linejoin', 'round');
    }
    t.textContent = tr(str);
    this.layer.append(t);
    return t;
  }

  /**
   * Linear dimension between model points a and b.
   * `offset` is in paper mm: for 'h' a positive value puts the line below the lower point,
   * for 'v' to the right of the rightmost point; for 'aligned' it is along the left normal.
   */
  dim(
    a: Pt,
    b: Pt,
    offset: number,
    o: {
      dir?: 'h' | 'v' | 'aligned';
      label?: Text;
      prefix?: string;
      suffix?: string;
      size?: number;
      color?: string;
    } = {},
  ): void {
    const pa = this.map(a);
    const pb = this.map(b);
    const color = o.color ?? INK;
    const dir = o.dir ?? 'aligned';
    let ea: Pt;
    let eb: Pt;
    let value: number;
    if (dir === 'h') {
      const yl = offset >= 0 ? Math.max(pa[1], pb[1]) + offset : Math.min(pa[1], pb[1]) + offset;
      ea = [pa[0], yl];
      eb = [pb[0], yl];
      value = Math.abs(b[0] - a[0]);
    } else if (dir === 'v') {
      const xl = offset >= 0 ? Math.max(pa[0], pb[0]) + offset : Math.min(pa[0], pb[0]) + offset;
      ea = [xl, pa[1]];
      eb = [xl, pb[1]];
      value = Math.abs(b[1] - a[1]);
    } else {
      const ux = pb[0] - pa[0];
      const uy = pb[1] - pa[1];
      const len = Math.hypot(ux, uy) || 1;
      const nx = uy / len;
      const ny = -ux / len;
      ea = [pa[0] + nx * offset, pa[1] + ny * offset];
      eb = [pb[0] + nx * offset, pb[1] + ny * offset];
      value = Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
    const p = this.drawing.paper();
    const ext = (from: Pt, to: Pt) => {
      const dx = to[0] - from[0];
      const dy = to[1] - from[1];
      const l = Math.hypot(dx, dy);
      if (l < 0.01) return;
      const ux = dx / l;
      const uy = dy / l;
      p.line([from[0] + ux * 0.8, from[1] + uy * 0.8], [to[0] + ux * 1.6, to[1] + uy * 1.6], { w: W.thin, color });
    };
    ext(pa, ea);
    ext(pb, eb);
    const dl = el('line', {
      x1: ea[0],
      y1: ea[1],
      x2: eb[0],
      y2: eb[1],
      stroke: color,
      'stroke-width': W.thin,
      'marker-start': 'url(#arrow)',
      'marker-end': 'url(#arrow)',
    });
    this.drawing.notes.append(dl);
    const label = o.label !== undefined ? tr(o.label) : `${o.prefix ?? ''}${fmt(value)}${o.suffix ?? ''}`;
    let ang = (Math.atan2(-(eb[1] - ea[1]), eb[0] - ea[0]) * 180) / Math.PI;
    if (ang > 90.5) ang -= 180;
    if (ang < -89.5) ang += 180;
    const mid: Pt = [(ea[0] + eb[0]) / 2, (ea[1] + eb[1]) / 2];
    const r = (ang * Math.PI) / 180;
    const tx = mid[0] - Math.sin(r) * 1.2;
    const ty = mid[1] - Math.cos(r) * 1.2;
    p.text([tx, ty], label, { size: o.size ?? 2.5, anchor: 'middle', rotate: ang, mono: true, color, halo: true });
  }

  /** Diameter dimension across a circle along `angle` (degrees), label outside on the right. */
  dimDiameter(c: Pt, r: number, angle = 30, o: { label?: Text; size?: number } = {}): void {
    const a = (angle * Math.PI) / 180;
    const p1: Pt = [c[0] - r * Math.cos(a), c[1] - r * Math.sin(a)];
    const p2: Pt = [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
    const q1 = this.map(p1);
    const q2 = this.map(p2);
    const tail: Pt = [q2[0] + Math.cos(a) * 6, q2[1] - Math.sin(a) * 6];
    const line = el('polyline', {
      points: `${q1.join(',')} ${q2.join(',')} ${tail.join(',')} ${tail[0] + 10},${tail[1]}`,
      fill: 'none',
      stroke: INK,
      'stroke-width': W.thin,
      'marker-start': 'url(#arrow)',
    });
    this.drawing.notes.append(line);
    const arrow2 = el('line', {
      x1: q1[0],
      y1: q1[1],
      x2: q2[0],
      y2: q2[1],
      stroke: INK,
      'stroke-width': W.thin,
      'marker-end': 'url(#arrow)',
    });
    this.drawing.notes.append(arrow2);
    this.drawing
      .paper()
      .text([tail[0] + 1, tail[1] - 0.8], o.label ?? `Ø${fmt(2 * r)}`, { size: o.size ?? 2.5, mono: true, halo: true });
  }

  /** Radius dimension from the centre to the circle along `angle` (degrees). */
  dimRadius(c: Pt, r: number, angle = 45, o: { label?: Text; size?: number } = {}): void {
    const a = (angle * Math.PI) / 180;
    const q0 = this.map(c);
    const q1 = this.map([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]);
    const line = el('line', {
      x1: q0[0],
      y1: q0[1],
      x2: q1[0],
      y2: q1[1],
      stroke: INK,
      'stroke-width': W.thin,
      'marker-end': 'url(#arrow)',
    });
    this.drawing.notes.append(line);
    const mid: Pt = [(q0[0] + q1[0]) / 2, (q0[1] + q1[1]) / 2];
    this.drawing
      .paper()
      .text([mid[0] + 1, mid[1] - 1], o.label ?? `R${fmt(r)}`, { size: o.size ?? 2.5, mono: true, halo: true });
  }

  /** Leader from a model point to a paper-space label position (relative offset in paper mm). */
  leader(
    at: Pt,
    dx: number,
    dy: number,
    label: Text,
    o: { balloon?: boolean; size?: number; color?: string } = {},
  ): void {
    const q = this.map(at);
    const end: Pt = [q[0] + dx, q[1] + dy];
    const p = this.drawing.paper();
    const color = o.color ?? INK;
    p.circle(q, 0.5, { w: 0, fill: color });
    if (o.balloon) {
      p.line(q, end, { w: W.thin, color });
      p.circle(end, 3.2, { w: W.thin, fill: COLORS.paper, color });
      p.text(end, label, { size: o.size ?? 2.6, anchor: 'middle', baseline: 'middle', weight: 'bold', color });
      return;
    }
    const shelf = dx >= 0 ? 4 : -4;
    p.polyline([q, end, [end[0] + shelf, end[1]]], { w: W.thin, color });
    p.text([end[0] + shelf + (dx >= 0 ? 1 : -1), end[1]], label, {
      size: o.size ?? 2.3,
      anchor: dx >= 0 ? 'start' : 'end',
      baseline: 'middle',
      color,
      halo: true,
    });
  }

  /** Section-cut indicator (A–A) between two model points, arrows pointing along `toward` (+1 / -1 normal side). */
  sectionMark(a: Pt, b: Pt, letter: string, toward: 1 | -1 = 1): void {
    const qa = this.map(a);
    const qb = this.map(b);
    const p = this.drawing.paper();
    p.line(qa, qb, { w: W.thin, dash: 'center', color: INK_2 });
    const ux = qb[0] - qa[0];
    const uy = qb[1] - qa[1];
    const len = Math.hypot(ux, uy) || 1;
    const nx = (-uy / len) * toward;
    const ny = (ux / len) * toward;
    for (const q of [qa, qb]) {
      p.line(q, [q[0] + nx * 5, q[1] + ny * 5], { w: W.medium });
      const arr = el('line', {
        x1: q[0],
        y1: q[1],
        x2: q[0] + nx * 5,
        y2: q[1] + ny * 5,
        stroke: INK,
        'stroke-width': W.medium,
        'marker-end': 'url(#arrow)',
      });
      this.drawing.notes.append(arr);
      p.text([q[0] + nx * 7, q[1] + ny * 7], letter, { size: 4, weight: 'bold', anchor: 'middle', baseline: 'middle' });
    }
  }

  /** View caption under a view (e.g. "VUE DE FACE — 1:5"). */
  caption(p: Pt, title: Text, scale?: string): void {
    const q = this.map(p);
    const pv = this.drawing.paper();
    pv.text(q, title, { size: 3, weight: 'bold', anchor: 'middle' });
    if (scale) pv.text([q[0], q[1] + 4], scale, { size: 2.2, anchor: 'middle', mono: true, color: INK_2 });
  }
}
