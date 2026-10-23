import type { DrawingSheet } from '../drawings/types';
import { t, tr } from '../i18n';
import { h, icon, ICONS } from './dom';

// Full-viewport viewer for the A3 drawings: fit to screen, wheel/pinch zoom around the
// pointer, drag to pan, previous/next sheet, SVG download and A3 print.

const PAPER_RATIO = 420 / 297;

export class DrawingViewer {
  readonly el = h('div', { class: 'dv', role: 'region' });
  private stage = h('div', { class: 'dv__stage' });
  private bar = h('div', { class: 'dv__bar' });
  private svg: SVGSVGElement | null = null;
  private serialized = '';
  private sheet: DrawingSheet | null = null;
  private base = { w: 0, h: 0 };
  private zoom = 1;
  private pan = { x: 0, y: 0 };
  private pointers = new Map<number, { x: number; y: number }>();
  private pinchDist = 0;

  constructor(
    private sheets: () => DrawingSheet[],
    private onNavigate: (id: string) => void,
  ) {
    this.el.append(this.stage, this.bar);
    this.stage.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    this.stage.addEventListener('pointerdown', (e) => this.onDown(e));
    this.stage.addEventListener('pointermove', (e) => this.onMove(e));
    const up = (e: PointerEvent) => {
      this.pointers.delete(e.pointerId);
      this.pinchDist = 0;
    };
    this.stage.addEventListener('pointerup', up);
    this.stage.addEventListener('pointercancel', up);
    this.stage.addEventListener('dblclick', () => this.fit());
    new ResizeObserver(() => this.fit()).observe(this.stage);
  }

  /** Render a sheet (re-render on language change by calling again). */
  show(sheet: DrawingSheet, keepView = false): void {
    const d = sheet.render();
    this.sheet = sheet;
    this.serialized = d.serialize();
    this.svg?.remove();
    this.svg = d.svg;
    this.svg.removeAttribute('width');
    this.svg.removeAttribute('height');
    this.svg.classList.add('dv__svg');
    this.stage.append(this.svg);
    this.renderBar();
    if (keepView) this.apply();
    else this.fit();
  }

  private renderBar(): void {
    const list = this.sheets();
    const i = this.sheet ? list.indexOf(this.sheet) : -1;
    const go = (k: number) => {
      const s = list[(k + list.length) % list.length];
      if (s) this.onNavigate(s.id);
    };
    this.bar.replaceChildren(
      h('button', { class: 'icon-btn', 'aria-label': t('prev'), onclick: () => go(i - 1) }, icon(ICONS.prev, 16)),
      h('span', { class: 'dv__no' }, this.sheet ? `${this.sheet.number} · ${i + 1}/${list.length}` : ''),
      h('button', { class: 'icon-btn', 'aria-label': t('next'), onclick: () => go(i + 1) }, icon(ICONS.next, 16)),
      h('span', { class: 'dv__sep' }),
      h(
        'button',
        { class: 'icon-btn', 'aria-label': t('zoomOut'), title: t('zoomOut'), onclick: () => this.zoomBy(1 / 1.4) },
        '−',
      ),
      h('button', { class: 'btn btn--small', onclick: () => this.fit() }, t('fitSheet')),
      h(
        'button',
        { class: 'icon-btn', 'aria-label': t('zoomIn'), title: t('zoomIn'), onclick: () => this.zoomBy(1.4) },
        '+',
      ),
      h('span', { class: 'dv__sep' }),
      h(
        'button',
        { class: 'icon-btn', 'aria-label': t('downloadSvg'), title: t('downloadSvg'), onclick: () => this.download() },
        icon(ICONS.download, 16),
      ),
      h(
        'button',
        { class: 'icon-btn', 'aria-label': t('printA3'), title: t('printA3'), onclick: () => this.print() },
        icon(ICONS.print, 16),
      ),
    );
  }

  /** Fit the whole sheet in the stage. */
  fit(): void {
    const r = this.stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const pad = 16;
    const w = Math.min(r.width - pad * 2, (r.height - pad * 2 - 44) * PAPER_RATIO);
    this.base = { w, h: w / PAPER_RATIO };
    this.zoom = 1;
    this.pan = { x: (r.width - w) / 2, y: Math.max(pad, (r.height - 44 - this.base.h) / 2) };
    this.apply();
  }

  private apply(): void {
    if (!this.svg) return;
    // resize the SVG itself (not a CSS scale) so text and lines stay crisp at any zoom
    this.svg.style.width = `${this.base.w * this.zoom}px`;
    this.svg.style.height = `${this.base.h * this.zoom}px`;
    this.svg.style.left = `${this.pan.x}px`;
    this.svg.style.top = `${this.pan.y}px`;
  }

  private zoomAt(factor: number, cx: number, cy: number): void {
    const z = Math.min(12, Math.max(0.5, this.zoom * factor));
    const k = z / this.zoom;
    this.pan.x = cx - (cx - this.pan.x) * k;
    this.pan.y = cy - (cy - this.pan.y) * k;
    this.zoom = z;
    this.apply();
  }

  private zoomBy(f: number): void {
    const r = this.stage.getBoundingClientRect();
    this.zoomAt(f, r.width / 2, r.height / 2);
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const r = this.stage.getBoundingClientRect();
    this.zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
  }

  private onDown(e: PointerEvent): void {
    this.stage.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  private onMove(e: PointerEvent): void {
    const prev = this.pointers.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    if (this.pointers.size === 2) {
      // pinch zoom around the midpoint
      this.pointers.set(e.pointerId, cur);
      const [a, b] = [...this.pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (this.pinchDist) {
        const r = this.stage.getBoundingClientRect();
        this.zoomAt(dist / this.pinchDist, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      }
      this.pinchDist = dist;
      return;
    }
    this.pan.x += cur.x - prev.x;
    this.pan.y += cur.y - prev.y;
    this.pointers.set(e.pointerId, cur);
    this.apply();
  }

  private fileName(): string {
    return this.sheet ? `${this.sheet.number}-${this.sheet.id}.svg` : 'drawing.svg';
  }

  download(): void {
    const blob = new Blob([this.serialized], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: this.fileName() });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /** Print on A3 landscape through a hidden frame (no pop-up). */
  print(): void {
    const frame = h('iframe', { class: 'dv__print', title: 'print' }) as HTMLIFrameElement;
    document.body.append(frame);
    const doc = frame.contentDocument!;
    doc.open();
    doc.write(
      `<!doctype html><html><head><title>${this.sheet ? tr(this.sheet.title) : ''}</title>` +
        '<style>@page{size:A3 landscape;margin:0}html,body{margin:0}svg{width:420mm;height:297mm;display:block}</style>' +
        `</head><body>${this.serialized.replace(/^<\?xml[^>]*>/, '')}</body></html>`,
    );
    doc.close();
    setTimeout(() => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => frame.remove(), 1000);
    }, 200);
  }
}
