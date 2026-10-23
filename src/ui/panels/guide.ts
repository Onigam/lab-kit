import { t, tr } from '../../i18n';
import type { AppContext } from '../context';
import { guideFor } from '../display';
import { fill, h, icon, ICONS, rich } from '../dom';

// Step-by-step guide (sael.net style): counters, step card, transport and timeline.

export function renderGuidePanel(ctx: AppContext, root: HTMLElement): void {
  const ui = ctx.ui;
  const guide = guideFor(ctx.def, ui.mode, ui.scene);
  if (!guide) {
    fill(root);
    return;
  }
  const n = guide.length;
  const i = Math.min(ui.step, n - 1);
  const step = guide[i];
  const allParts = new Set(guide.flatMap((s) => s.parts));
  const installed = new Set(guide.slice(0, i + 1).flatMap((s) => s.parts));
  const go = (k: number) => ctx.store.set({ step: Math.max(0, Math.min(n - 1, k)), playing: false });

  const counters = h(
    'div',
    { class: 'counters' },
    h('div', { class: 'counter' }, h('span', {}, t('step')), h('b', {}, String(i + 1)), h('small', {}, `/${n}`)),
    h(
      'div',
      { class: 'counter' },
      h('span', {}, t('partsIn')),
      h('b', {}, String(installed.size)),
      h('small', {}, `/${allParts.size}`),
    ),
  );

  const parts = step.parts;
  const card = h(
    'div',
    { class: 'step-card' },
    h('div', { class: 'eyebrow' }, `${t('step')} ${i + 1} · ${tr(step.title)}`),
    h('p', {}, rich(tr(step.text))),
    parts.length
      ? h(
          'div',
          { class: 'part-chips' },
          ...parts.map((id) =>
            h(
              'button',
              { class: 'part-chip', onclick: () => ctx.stage.frameParts([id], 2.4) },
              tr(ctx.partInfo(id)?.name ?? { fr: id, en: id }),
            ),
          ),
        )
      : null,
    h(
      'div',
      { class: 'meta-row' },
      step.tools?.length
        ? h('div', { class: 'meta' }, h('span', {}, t('tools')), h('b', {}, step.tools.map(tr).join(' · ')))
        : null,
      step.torque ? h('div', { class: 'meta' }, h('span', {}, t('torque')), h('b', {}, step.torque)) : null,
      step.duration ? h('div', { class: 'meta' }, h('span', {}, t('duration')), h('b', {}, step.duration)) : null,
    ),
    step.warning
      ? h('div', { class: 'callout callout--warn' }, icon(ICONS.warn, 16), h('span', {}, rich(tr(step.warning))))
      : null,
    step.tip
      ? h('div', { class: 'callout callout--tip' }, h('b', {}, t('tip')), h('span', {}, rich(tr(step.tip))))
      : null,
  );

  const transport = h(
    'div',
    { class: 'transport' },
    h(
      'button',
      { class: 'icon-btn', 'aria-label': t('prev'), onclick: () => go(i - 1), disabled: i === 0 },
      icon(ICONS.prev),
    ),
    h(
      'button',
      {
        class: 'icon-btn icon-btn--accent',
        'aria-label': ui.playing ? t('pause') : t('play'),
        onclick: () => ctx.store.set({ playing: !ui.playing }),
      },
      icon(ui.playing ? ICONS.pause : ICONS.play),
    ),
    h(
      'button',
      { class: 'icon-btn', 'aria-label': t('next'), onclick: () => go(i + 1), disabled: i === n - 1 },
      icon(ICONS.next),
    ),
    h(
      'label',
      { class: 'toggle' },
      h('input', {
        type: 'checkbox',
        checked: ui.ghost,
        onchange: (e: Event) => ctx.store.set({ ghost: (e.target as HTMLInputElement).checked }),
      }),
      t('ghost'),
    ),
    h(
      'label',
      { class: 'toggle' },
      h('input', {
        type: 'checkbox',
        checked: ui.autoFrame,
        onchange: (e: Event) => ctx.store.set({ autoFrame: (e.target as HTMLInputElement).checked }),
      }),
      t('autoFrame'),
    ),
  );

  const timeline = h(
    'div',
    { class: 'timeline' },
    h('div', { class: 'eyebrow' }, ui.mode === 'assembly' ? t('theBuild') : t('theInstall')),
    h('input', {
      type: 'range',
      min: 0,
      max: n - 1,
      step: 1,
      value: i,
      'aria-label': t('step'),
      oninput: (e: Event) => go(Number((e.target as HTMLInputElement).value)),
    }),
    h(
      'div',
      { class: 'ticks' },
      ...guide.map((s, k) =>
        h(
          'button',
          {
            class: `tick ${k === i ? 'is-active' : ''} ${k < i ? 'is-done' : ''}`,
            title: tr(s.title),
            onclick: () => go(k),
          },
          String(k + 1),
        ),
      ),
    ),
  );

  fill(
    root,
    h('div', { class: 'eyebrow eyebrow--accent' }, ui.mode === 'assembly' ? t('assemblyTitle') : t('installTitle')),
    h('h2', { class: 'panel-title' }, tr(step.title)),
    counters,
    card,
    transport,
    timeline,
  );
}
