import * as THREE from 'three';
import type { PartInfo } from '../../content/types';
import { sheetsForPart } from '../../drawings/types';
import { t, tr, type CommonKey } from '../../i18n';
import type { AppContext } from '../context';
import { fill, h, icon, ICONS, rich } from '../dom';

// Explore mode: part sheet (Learn-Arduino-like tabs) or scene overview when nothing is selected.

type Tab = 'overview' | 'specs' | 'maintenance' | 'design';

let tab: Tab = 'overview';

const CAT_KEY: Record<PartInfo['category'], CommonKey> = {
  hydraulic: 'catHydraulic',
  mechanical: 'catMechanical',
  electrical: 'catElectrical',
  structure: 'catStructure',
  site: 'catSite',
};

function chips(info: PartInfo): HTMLElement {
  return h(
    'div',
    { class: 'chips' },
    h('span', { class: `chip chip--${info.category}` }, t(CAT_KEY[info.category])),
    info.qty && info.qty > 1 ? h('span', { class: 'chip' }, `× ${info.qty}`) : null,
  );
}

function envelope(ctx: AppContext, id: string): string | null {
  const box = ctx.stage.active.registry.bounds(id);
  if (box.isEmpty()) return null;
  const s = box.getSize(new THREE.Vector3());
  const big = s.x >= 1 || s.y >= 1 || s.z >= 1;
  const f = (v: number) => (big ? v.toFixed(2) : String(Math.round(v * 1000)));
  return `${f(s.x)} × ${f(s.y)} × ${f(s.z)} ${big ? 'm' : 'mm'}`;
}

function tabBody(ctx: AppContext, info: PartInfo): HTMLElement {
  switch (tab) {
    case 'overview':
      return h(
        'div',
        { class: 'tab-body' },
        h('p', {}, rich(tr(info.description))),
        info.tip
          ? h('div', { class: 'callout callout--tip' }, h('b', {}, t('tip')), h('span', {}, rich(tr(info.tip))))
          : null,
      );
    case 'specs': {
      const env = envelope(ctx, info.id);
      return h(
        'dl',
        { class: 'specs' },
        h('dt', {}, t('material')),
        h('dd', {}, tr(info.material)),
        ...info.specs.flatMap((s) => [h('dt', {}, tr(s.label)), h('dd', {}, tr(s.value))]),
        env ? h('dt', {}, t('dimensions')) : null,
        env ? h('dd', {}, env) : null,
      );
    }
    case 'maintenance':
      return h('div', { class: 'tab-body' }, h('p', {}, info.maintenance ? rich(tr(info.maintenance)) : '—'));
    case 'design':
      return h(
        'div',
        { class: 'tab-body' },
        info.design
          ? h('div', { class: 'callout callout--design' }, h('span', {}, rich(tr(info.design))))
          : h('p', {}, '—'),
      );
  }
}

export function renderPartPanel(ctx: AppContext, root: HTMLElement): void {
  const id = ctx.ui.selected;
  const info = id ? ctx.partInfo(id) : undefined;
  if (!id || !info) {
    renderOverview(ctx, root);
    return;
  }
  const tabs: [Tab, CommonKey][] = [
    ['overview', 'overview'],
    ['specs', 'specs'],
    ['maintenance', 'maintenance'],
  ];
  if (info.design) tabs.push(['design', 'design']);
  if (!tabs.some(([k]) => k === tab)) tab = 'overview';

  const link = ctx.def.partLinks?.[id];
  const rerender = () => renderPartPanel(ctx, root);
  fill(
    root,
    h(
      'div',
      { class: 'panel-head' },
      chips(info),
      h(
        'button',
        { class: 'icon-btn', 'aria-label': t('close'), onclick: () => ctx.selectPart(null, { frame: false }) },
        icon(ICONS.close, 18),
      ),
    ),
    h('h2', { class: 'panel-title' }, tr(info.name)),
    h('p', { class: 'lead' }, rich(tr(info.short))),
    h(
      'div',
      { class: 'tabs', role: 'tablist' },
      ...tabs.map(([k, key]) =>
        h(
          'button',
          {
            class: `tab ${tab === k ? 'is-active' : ''}`,
            role: 'tab',
            'aria-selected': tab === k ? 'true' : 'false',
            onclick: () => {
              tab = k;
              rerender();
            },
          },
          t(key),
        ),
      ),
    ),
    tabBody(ctx, info),
    h(
      'div',
      { class: 'actions' },
      h(
        'button',
        {
          class: `btn ${ctx.ui.isolate ? 'is-on' : ''}`,
          onclick: () => {
            ctx.store.set({ isolate: !ctx.ui.isolate });
            ctx.stage.frameParts([id], 1.5);
          },
        },
        icon(ICONS.isolate, 16),
        ctx.ui.isolate ? t('showAll') : t('isolate'),
      ),
      h('button', { class: 'btn', onclick: () => ctx.stage.frameParts([id], 1.5) }, icon(ICONS.focus, 16), t('focus')),
      ...(ctx.def.partActions?.(ctx, info) ?? []),
      ...sheetsForPart(ctx.def.plans?.sheets ?? [], id).map((sheet) =>
        h(
          'button',
          {
            class: 'btn btn--ghost',
            onclick: () => ctx.store.set({ mode: 'plans', drawing: sheet.id, panelOpen: true }),
          },
          icon(ICONS.plans, 16),
          `${sheet.number} · ${tr(sheet.title)}`,
        ),
      ),
      link && link.scene !== ctx.ui.scene
        ? h('button', { class: 'btn btn--primary', onclick: () => ctx.gotoScene(link.scene) }, tr(link.label))
        : null,
      ...(info.video ?? [])
        .slice(0, 2)
        .map((ts) =>
          h(
            'a',
            { class: 'btn btn--ghost', href: ctx.videoUrl(ts), target: '_blank', rel: 'noopener noreferrer' },
            icon(ICONS.video, 16),
            `${t('inVideo')} ${ts}`,
          ),
        ),
    ),
  );
}

function renderOverview(ctx: AppContext, root: HTMLElement): void {
  const scene = ctx.ui.scene;
  const overview = ctx.sceneDef(scene)?.overview;
  const parts = ctx.def.parts.filter((p) => p.scene === scene);
  fill(
    root,
    overview ? h('h2', { class: 'panel-title' }, tr(overview.title)) : null,
    overview ? h('p', { class: 'lead' }, rich(tr(overview.text))) : null,
    overview?.actions?.length
      ? h(
          'div',
          { class: 'actions' },
          ...overview.actions.map((a) =>
            h(
              'button',
              { class: a.primary ? 'btn btn--primary' : 'btn', onclick: () => ctx.gotoScene(a.scene) },
              tr(a.label),
            ),
          ),
        )
      : null,
    h('h3', { class: 'section-title' }, t('partsInScene'), h('span', { class: 'count' }, String(parts.length))),
    h(
      'div',
      { class: 'part-chips' },
      ...parts.map((p) =>
        h('button', { class: `part-chip part-chip--${p.category}`, onclick: () => ctx.selectPart(p.id) }, tr(p.name)),
      ),
    ),
    h('p', { class: 'hint' }, t('noSelection')),
    h('p', { class: 'hint' }, t('controlsHelp')),
  );
}
