import { t, tr, type CommonKey } from '../../i18n';
import type { AppContext } from '../context';
import { fill, h, icon, ICONS, rich } from '../dom';

// "Plans" mode side panel: sheet list grouped by trade, description of the current sheet,
// links back to the 3D parts, and a line-type legend.

/** Small SVG sample of a line type for the legend. */
function lineSample(dash: string, width: number): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', '34');
  svg.setAttribute('height', '8');
  svg.setAttribute('viewBox', '0 0 34 8');
  svg.setAttribute('aria-hidden', 'true');
  const ln = document.createElementNS(ns, 'line');
  for (const [k, v] of Object.entries({ x1: 1, x2: 33, y1: 4, y2: 4, stroke: '#1d2b3a', 'stroke-width': width })) {
    ln.setAttribute(k, String(v));
  }
  if (dash) ln.setAttribute('stroke-dasharray', dash);
  svg.append(ln);
  return svg;
}

export function renderPlansPanel(ctx: AppContext, root: HTMLElement): void {
  const plans = ctx.def.plans;
  if (!plans) return;
  const SHEETS = plans.sheets;
  const current = SHEETS.find((s) => s.id === ctx.ui.drawing) ?? SHEETS[0];
  const legendItems = (
    [
      ['', 2.2, 'lineThick'],
      ['', 0.9, 'lineThin'],
      ['10 3 2 3', 0.9, 'lineCenter'],
      ['5 3', 0.9, 'lineHidden'],
    ] as [string, number, CommonKey][]
  ).map(([dash, w, key]) => h('li', {}, lineSample(dash, w), t(key)));

  fill(
    root,
    h('div', { class: 'eyebrow eyebrow--accent' }, t('modePlans')),
    h('h2', { class: 'panel-title' }, t('plansTitle')),
    h('p', { class: 'lead' }, tr(plans.intro)),
    ...plans.groups.map(({ id: g, label }) => {
      const items = SHEETS.filter((s) => s.group === g);
      if (!items.length) return null;
      return h(
        'div',
        { class: 'sheet-group' },
        h('h3', { class: 'section-title' }, tr(label)),
        ...items.map((s) =>
          h(
            'button',
            {
              class: `sheet-row ${s === current ? 'is-active' : ''}`,
              onclick: () => ctx.store.set({ drawing: s.id }),
            },
            h('span', { class: 'sheet-row__no' }, s.number),
            h('span', {}, tr(s.title)),
          ),
        ),
      );
    }),
    h(
      'div',
      { class: 'step-card' },
      h('div', { class: 'eyebrow' }, `${current.number} · ${tr(current.title)}`),
      h('p', {}, rich(tr(current.description))),
    ),
    h(
      'div',
      { class: 'actions' },
      current.scene
        ? h(
            'button',
            {
              class: 'btn btn--primary',
              onclick: () => {
                ctx.store.set({ mode: 'explore', scene: current.scene!, panelOpen: true });
                const first = current.parts?.find((id) => ctx.stage.get(current.scene!)?.registry.get(id));
                if (first) ctx.selectPart(first, { mode: 'explore' });
              },
            },
            icon(ICONS.explore, 16),
            t('seeIn3d'),
          )
        : null,
    ),
    h('p', { class: 'hint' }, t('plansHelp')),
    h('h3', { class: 'section-title' }, t('lineTypes')),
    h('ul', { class: 'line-legend' }, ...legendItems),
    plans.footer?.() ?? null,
  );
}
