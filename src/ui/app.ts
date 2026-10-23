import { getLang, onLangChange, setLang, t, tr, colon, type CommonKey } from '../i18n';
import type { Stage } from '../three';
import { AppContext } from './context';
import type { DisplayController } from './display';
import { fill, h, icon, ICONS, rich } from './dom';
import type { LabDefinition, LabSim, PanelController } from './lab';
import { panelEdge } from './panel-size';
import { renderGuidePanel } from './panels/guide';
import { renderAboutPanel, renderLessonsPanel, renderPartsPanel } from './panels/misc';
import { renderPartPanel } from './panels/part';
import { renderPlansPanel } from './panels/plans';
import type { Mode, Store, UiState } from './state';
import { DrawingViewer } from './viewer';

// Application shell: header, mode rail, contextual right panel, viewport toolbar and
// the live measurement strip. Wires the store to the 3D stage and the simulation.

const MODES: [Mode, CommonKey, keyof typeof ICONS][] = [
  ['explore', 'modeExplore', 'explore'],
  ['assembly', 'modeAssembly', 'assembly'],
  ['install', 'modeInstall', 'install'],
  ['sim', 'modeSim', 'sim'],
  ['plans', 'modePlans', 'plans'],
  ['lessons', 'modeLessons', 'lessons'],
  ['parts', 'modeParts', 'parts'],
  ['about', 'modeAbout', 'about'],
];

const SPEEDS = [1, 60, 600, 3600];
const SLOWMO: [number, string][] = [
  [1, '×1'],
  [0.2, '×1/5'],
  [0.05, '×1/20'],
  [0.02, '×1/50'],
];

export class App<S extends LabSim = any> {
  readonly ctx: AppContext<S>;
  private header = h('header', { class: 'topbar' });
  private rail = h('nav', { class: 'rail' });
  private panel = h('aside', { class: 'panel' });
  private panelBody = h('div', { class: 'panel__body' });
  private toolbar = h('div', { class: 'toolbar' });
  private strip = h('footer', { class: 'strip' });
  private stripValues = h('div', { class: 'strip__values' });
  private stripAlarms = h('div', { class: 'strip__alarms', 'aria-live': 'polite' });
  private stripClock = h('div', { class: 'strip__clock' });
  private peek = h('div', { class: 'peek' });
  private panelToggle = h('button', { class: 'panel-toggle' });
  private viewer: DrawingViewer;
  private simPanel: PanelController | null;
  private lastStrip = 0;
  private lastAlarmKey = '';
  /** Worlds already framed once (the first visit starts on an overview). */
  private visited = new Set<string>();

  constructor(
    private def: LabDefinition<S>,
    host: HTMLElement,
    viewport: HTMLElement,
    stage: Stage,
    private store: Store,
    private display: DisplayController,
  ) {
    this.ctx = new AppContext(def, stage, store);
    this.visited.add(store.state.scene);
    this.simPanel = def.simPanel?.(this.ctx) ?? null;
    this.panel.append(
      panelEdge(def.id),
      h('button', {
        class: 'panel__grip',
        'aria-label': t('menu'),
        onclick: () => store.set({ sheet: !store.state.sheet }),
      }),
      this.panelBody,
    );
    this.viewer = new DrawingViewer(
      () => def.plans?.sheets ?? [],
      (id) => store.set({ drawing: id }),
    );
    viewport.append(this.toolbar, this.peek, this.panelToggle, this.viewer.el);
    this.panelToggle.addEventListener('click', () => store.set({ panelOpen: !store.state.panelOpen }));
    this.strip.append(this.stripClock, this.stripValues, this.stripAlarms);
    host.append(this.header, this.rail, this.panel, this.strip);

    stage.labelMode = store.state.labels;
    store.on((s, prev) => this.onState(s, prev));
    def.sim.onChange(() => {
      this.renderHeader();
      if (this.store.state.mode !== 'sim') this.renderPanel();
    });
    onLangChange(() => this.renderAll());
    this.renderAll();
  }

  private onState(s: UiState, prev: UiState): void {
    const stage = this.ctx.stage;
    if (s.scene !== prev.scene) {
      stage.setActive(s.scene);
      if (!this.visited.has(s.scene)) {
        this.visited.add(s.scene);
        requestAnimationFrame(() => stage.frameAll(0.01));
      }
    }
    if (s.selected !== prev.selected || s.scene !== prev.scene) stage.setSelection(s.selected);
    if (s.labels !== prev.labels) {
      stage.labelMode = s.labels;
      stage.refreshLabels();
    }
    if (s.cutaway !== prev.cutaway || s.scene !== prev.scene) this.applyCutaway();
    document.body.classList.toggle('sheet-open', s.sheet);
    document.body.classList.toggle('panel-closed', !s.panelOpen);
    document.body.classList.toggle('mode-plans', s.mode === 'plans');
    if (s.mode === 'plans' && (prev.mode !== 'plans' || s.drawing !== prev.drawing)) this.showDrawing(false);
    if (s.panelOpen !== prev.panelOpen) requestAnimationFrame(() => stage.frameAll(0.4));
    const panelKeys: (keyof UiState)[] = [
      'mode',
      'scene',
      'selected',
      'step',
      'lesson',
      'isolate',
      'playing',
      'ghost',
      'autoFrame',
    ];
    if (panelKeys.some((k) => s[k] !== prev[k])) {
      if (!(s.mode === 'sim' && prev.mode === 'sim' && s.scene === prev.scene)) this.renderPanel();
      this.renderRail();
      this.renderToolbar();
      this.renderHeader();
    } else {
      this.renderToolbar();
    }
    this.renderPeek();
  }

  private applyCutaway(): void {
    const s = this.store.state;
    this.def.onCutaway?.(s.cutaway, s.scene);
  }

  renderAll(): void {
    document.documentElement.lang = getLang();
    if (this.store.state.mode === 'plans') this.showDrawing(true);
    document.title = this.def.brand.title;
    this.renderHeader();
    this.renderRail();
    this.renderPanel();
    this.renderToolbar();
    this.renderPeek();
    this.ctx.stage.refreshLabels();
  }

  // ------------------------------------------------------------ header

  private renderHeader(): void {
    const s = this.store.state;
    const lessons = this.def.lessons?.items ?? [];
    const done = this.ctx.lessonsDone().size;
    fill(
      this.header,
      h(
        'div',
        { class: 'brand' },
        h('img', { src: this.def.brand.icon, alt: '', width: 34, height: 34 }),
        h('div', {}, h('h1', {}, this.def.brand.title), h('p', {}, tr(this.def.brand.tagline))),
      ),
      h(
        'div',
        { class: 'segmented scene-switch', role: 'tablist', 'aria-label': 'Scene' },
        ...this.def.scenes.map(({ id, label }) =>
          h(
            'button',
            {
              class: s.scene === id ? 'is-active' : '',
              role: 'tab',
              'aria-selected': s.scene === id ? 'true' : 'false',
              onclick: () => this.ctx.gotoScene(id),
            },
            tr(label),
          ),
        ),
      ),
      h(
        'div',
        { class: 'topbar__right' },
        lessons.length
          ? h(
              'button',
              { class: 'progress', onclick: () => this.ctx.setMode('lessons') },
              icon(ICONS.lessons, 16),
              h('span', {}, t('modeLessons')),
              h('b', {}, `${done}/${lessons.length}`),
              h('i', { style: `--p:${(done / lessons.length) * 100}%` }),
            )
          : null,
        h(
          'div',
          { class: 'segmented lang-switch' },
          ...(['fr', 'en'] as const).map((l) =>
            h('button', { class: getLang() === l ? 'is-active' : '', onclick: () => setLang(l) }, l.toUpperCase()),
          ),
        ),
      ),
    );
  }

  /** Modes with content in this lab (a mode without content is hidden, never reinvented). */
  private availableModes(): typeof MODES {
    const d = this.def;
    const has: Record<Mode, boolean> = {
      explore: true,
      assembly: !!d.guides?.assembly,
      install: !!d.guides?.install,
      sim: !!d.simPanel,
      plans: !!d.plans?.sheets.length,
      lessons: !!d.lessons?.items.length,
      parts: true,
      about: true,
    };
    return MODES.filter(([mode]) => has[mode]);
  }

  private renderRail(): void {
    const s = this.store.state;
    fill(
      this.rail,
      ...this.availableModes().map(([mode, key, ic]) =>
        h(
          'button',
          {
            class: `rail__btn ${s.mode === mode ? 'is-active' : ''}`,
            'aria-label': t(key),
            'aria-pressed': s.mode === mode ? 'true' : 'false',
            onclick: () => {
              this.ctx.setMode(mode);
              this.store.set({ sheet: true, panelOpen: true });
            },
          },
          icon(ICONS[ic], 21),
          h('span', {}, t(key)),
        ),
      ),
    );
  }

  private renderPanel(): void {
    const s = this.store.state;
    const body = this.panelBody;
    body.scrollTop = 0;
    switch (s.mode) {
      case 'explore':
        renderPartPanel(this.ctx, body);
        break;
      case 'assembly':
      case 'install':
        renderGuidePanel(this.ctx, body);
        break;
      case 'sim':
        if (this.simPanel) {
          fill(body, this.simPanel.el);
          this.simPanel.render();
        }
        break;
      case 'lessons':
        renderLessonsPanel(this.ctx, body, () => this.renderHeader());
        break;
      case 'parts':
        renderPartsPanel(this.ctx, body);
        break;
      case 'about':
        renderAboutPanel(this.ctx, body);
        break;
      case 'plans':
        renderPlansPanel(this.ctx, body);
        break;
    }
  }

  /** Render the current drawing (keepView: keep zoom/pan, e.g. after a language change). */
  private showDrawing(keepView: boolean): void {
    const sheets = this.def.plans?.sheets ?? [];
    const sheet = sheets.find((x) => x.id === this.store.state.drawing) ?? sheets[0];
    if (sheet) this.viewer.show(sheet, keepView);
  }

  // ------------------------------------------------------------ viewport toolbar

  private renderToolbar(): void {
    const s = this.store.state;
    const e = this.ctx.sim;
    const scene = this.ctx.sceneDef(s.scene);
    const guide = s.mode === 'assembly' || s.mode === 'install';
    const btn = (label: string, on: boolean, click: () => void, extra = '') =>
      h(
        'button',
        { class: `tool ${on ? 'is-on' : ''} ${extra}`, 'aria-pressed': on ? 'true' : 'false', onclick: click },
        label,
      );
    const nextLabels = { main: 'all', all: 'none', none: 'main' } as const;
    const labelKey: Record<UiState['labels'], CommonKey> = { main: 'labelsMain', all: 'labelsAll', none: 'labelsNone' };
    const slow = SLOWMO.find(([v]) => v === e.params.slowMo) ?? SLOWMO[0];
    const sel = s.selected;
    fill(
      this.toolbar,
      h(
        'button',
        {
          class: 'tool',
          onclick: () => (this.store.set({ isolate: false }), this.ctx.stage.frameAll()),
          title: t('overviewHint'),
        },
        icon(ICONS.home, 16),
        h('span', {}, t('overviewBtn')),
      ),
      guide
        ? null
        : h(
            'div',
            { class: 'tool tool--range' },
            h(
              'button',
              { class: 'tool__mini', onclick: () => this.store.set({ explode: 0 }), title: t('assemble') },
              '◀',
            ),
            h('label', {}, t('explode')),
            h('input', {
              type: 'range',
              min: 0,
              max: 1,
              step: 0.01,
              value: s.explode,
              'aria-label': t('explode'),
              oninput: (ev: Event) => this.store.set({ explode: Number((ev.target as HTMLInputElement).value) }),
            }),
            h(
              'button',
              { class: 'tool__mini', onclick: () => this.store.set({ explode: 1 }), title: t('disassemble') },
              '▶',
            ),
          ),
      guide || !sel
        ? null
        : btn(t('isolate'), s.isolate, () => {
            this.store.set({ isolate: !s.isolate });
            if (!s.isolate) requestAnimationFrame(() => this.ctx.stage.frameParts([sel], 1.5));
            else this.ctx.stage.frameAll();
          }),
      // in the landscape, X-ray only makes sense around a selected part
      guide || (scene?.xrayNeedsSelection && !sel)
        ? null
        : btn(t('xray'), s.xray, () => this.store.set({ xray: !s.xray })),
      scene?.cutaway !== false ? btn(t('cutaway'), s.cutaway, () => this.store.set({ cutaway: !s.cutaway })) : null,
      btn(t('flows'), s.schematic, () => this.store.set({ schematic: !s.schematic })),
      btn(`${t('labels')}${colon()}${t(labelKey[s.labels])}`, s.labels !== 'none', () =>
        this.store.set({ labels: nextLabels[s.labels] }),
      ),
      scene?.slowMo !== false
        ? btn(`${t('slowMo')} ${slow[1]}`, e.params.slowMo < 1, () => {
            const i = SLOWMO.findIndex(([v]) => v === e.params.slowMo);
            e.set({ slowMo: SLOWMO[(i + 1) % SLOWMO.length][0] });
            this.renderToolbar();
          })
        : null,
    );
  }

  private renderPeek(): void {
    const s = this.store.state;
    fill(this.panelToggle, icon(s.panelOpen ? ICONS.next : ICONS.prev, 16));
    this.panelToggle.setAttribute('aria-label', s.panelOpen ? t('hidePanel') : t('showPanel'));
    this.panelToggle.title = s.panelOpen ? t('hidePanel') : t('showPanel');
    const info = s.selected ? this.ctx.partInfo(s.selected) : undefined;
    // in explore mode the panel already shows the sheet, unless it is collapsed
    const show = !!info && (s.mode !== 'explore' || !s.panelOpen) && s.mode !== 'parts';
    this.peek.classList.toggle('is-visible', show);
    if (!show || !info) return;
    fill(
      this.peek,
      h('b', {}, tr(info.name)),
      h('p', {}, rich(tr(info.short))),
      h(
        'div',
        { class: 'actions' },
        h(
          'button',
          {
            class: 'btn btn--small',
            onclick: () => {
              this.ctx.selectPart(info.id, { mode: 'explore', frame: false });
              this.store.set({ panelOpen: true });
            },
          },
          t('overview'),
        ),
        h(
          'button',
          {
            class: `btn btn--small ${s.isolate ? 'is-on' : ''}`,
            onclick: () => {
              this.store.set({ isolate: !s.isolate });
              requestAnimationFrame(() =>
                s.isolate ? this.ctx.stage.frameAll() : this.ctx.stage.frameParts([info.id], 1.5),
              );
            },
          },
          s.isolate ? t('showAll') : t('isolate'),
        ),
        h(
          'button',
          { class: 'icon-btn', 'aria-label': t('close'), onclick: () => this.store.set({ selected: null }) },
          icon(ICONS.close, 16),
        ),
      ),
    );
  }

  // ------------------------------------------------------------ live strip

  private renderStrip(): void {
    const sim = this.ctx.sim;
    const p = sim.params;
    const strip = this.def.strip;
    const speeds = strip.speeds ?? SPEEDS;
    fill(
      this.stripValues,
      ...strip
        .values(sim)
        .map((v) =>
          h(
            'div',
            { class: `live ${v.cls ?? ''}` },
            h('span', {}, v.label),
            h('b', {}, v.value, h('small', {}, ` ${v.unit}`)),
          ),
        ),
    );
    const clock = strip.clock(sim);
    fill(
      this.stripClock,
      h(
        'button',
        {
          class: 'icon-btn',
          'aria-label': p.running ? t('pause') : t('play'),
          onclick: () => sim.set({ running: !p.running }),
        },
        icon(p.running ? ICONS.pause : ICONS.play, 16),
      ),
      h('div', { class: 'clock' }, h('b', {}, clock.time), h('small', {}, clock.sub)),
      h(
        'div',
        { class: 'segmented segmented--tiny', 'aria-label': t('speed') },
        ...speeds.map((sp) =>
          h(
            'button',
            {
              class: p.timeScale === sp ? 'is-active' : '',
              onclick: () => sim.set({ timeScale: sp }),
              title: sp === 1 ? t('realTime') : '',
            },
            sp === 1 ? '×1' : `×${sp}`,
          ),
        ),
      ),
    );
    const alarms = strip.alarms(sim);
    const key = alarms.map((a) => a.label).join('|');
    if (key !== this.lastAlarmKey) {
      this.lastAlarmKey = key;
      fill(
        this.stripAlarms,
        ...(alarms.length
          ? alarms.map((a) =>
              h('span', { class: `alarm ${a.severe ? 'alarm--severe' : ''}` }, icon(ICONS.warn, 14), a.label),
            )
          : [h('span', { class: 'alarm alarm--ok' }, icon(ICONS.ok, 14), t('allGood'))]),
      );
    }
  }

  /** Per-frame UI work (throttled). */
  tick(dt: number): void {
    this.lastStrip += dt;
    if (this.lastStrip > 0.2) {
      this.lastStrip = 0;
      this.renderStrip();
    }
    if (this.store.state.mode === 'sim') this.simPanel?.tick(dt);
    this.display.update(dt);
  }
}
