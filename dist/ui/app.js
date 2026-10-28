import { getLang, onLangChange, setLang, t, tr, colon } from '../i18n';
import { AppContext } from './context';
import { guideDef, stepScene } from './display';
import { fill, h, icon, ICONS, rich, watchOverflow } from './dom';
import { panelEdge } from './panel-size';
import { renderGuidePanel } from './panels/guide';
import { renderAboutPanel, renderLessonsPanel, renderPartsPanel } from './panels/misc';
import { renderPartPanel } from './panels/part';
import { renderPlansPanel } from './panels/plans';
import { bindSheetDrag } from './sheet';
import { DrawingViewer } from './viewer';
// Application shell: header, mode rail, contextual right panel, viewport toolbar and
// the live measurement strip. Wires the store to the 3D stage and the simulation.
const MODES = [
    ['explore', 'modeExplore', 'explore'],
    ['assembly', 'modeAssembly', 'assembly'],
    ['install', 'modeInstall', 'install'],
    ['sim', 'modeSim', 'sim'],
    ['plans', 'modePlans', 'plans'],
    ['lessons', 'modeLessons', 'lessons'],
    ['parts', 'modeParts', 'parts'],
    ['about', 'modeAbout', 'about'],
];
/**
 * The phone layout (bottom sheet) and the short-screen layout (toolbar at the top): same breakpoints as the stylesheet. A phone
 * on its side (from 640 px wide, up to 500 px high) has the side panel, like a tablet.
 */
const PHONE = '(max-width: 639px), (max-width: 760px) and (min-height: 501px)';
const SHORT = '(max-height: 500px)';
const SPEEDS = [1, 60, 600, 3600];
const SLOWMO = [
    [1, '×1'],
    [0.2, '×1/5'],
    [0.05, '×1/20'],
    [0.02, '×1/50'],
];
export class App {
    def;
    store;
    display;
    ctx;
    header = h('header', { class: 'topbar' });
    rail = h('nav', { class: 'rail' });
    /** The modes row: it scrolls on a phone (a fade shows where it goes on); on a desktop it is transparent to layout. */
    railScroll = h('div', { class: 'rail__scroll' });
    panel = h('aside', { class: 'panel' });
    panelBody = h('div', { class: 'panel__body' });
    grip = h('button', { class: 'panel__grip', 'aria-expanded': 'false' });
    toolbar = h('div', { class: 'toolbar' });
    toolbarRow = h('div', { class: 'toolbar__row' });
    strip = h('footer', { class: 'strip' });
    stripValues = h('div', { class: 'strip__values' });
    stripAlarms = h('div', { class: 'strip__alarms', 'aria-live': 'polite' });
    stripClock = h('div', { class: 'strip__clock' });
    peek = h('div', { class: 'peek' });
    panelToggle = h('button', { class: 'panel-toggle' });
    viewer;
    simPanel;
    lastStrip = 0;
    lastAlarmKey = '';
    /** Worlds already framed once (the first visit starts on an overview). */
    visited = new Set();
    constructor(def, host, viewport, stage, store, display) {
        this.def = def;
        this.store = store;
        this.display = display;
        this.ctx = new AppContext(def, stage, store);
        this.visited.add(store.state.scene);
        this.simPanel = def.simPanel?.(this.ctx) ?? null;
        this.grip.setAttribute('aria-label', t('menu'));
        this.panel.append(panelEdge(def.id), this.grip, this.panelBody);
        bindSheetDrag({
            panel: this.panel,
            grip: this.grip,
            isOpen: () => store.state.sheet,
            setOpen: (sheet) => store.set({ sheet }),
        });
        this.rail.append(this.railScroll);
        this.toolbar.append(this.toolbarRow);
        this.viewer = new DrawingViewer(() => def.plans?.sheets ?? [], (id) => store.set({ drawing: id }));
        viewport.append(this.toolbar, this.peek, this.panelToggle, this.viewer.el);
        this.panelToggle.addEventListener('click', () => store.set({ panelOpen: !store.state.panelOpen }));
        this.strip.append(this.stripClock, this.stripValues, this.stripAlarms);
        host.append(this.header, this.rail, this.panel, this.strip);
        watchOverflow(this.railScroll, this.rail);
        watchOverflow(this.toolbarRow, this.toolbar);
        watchOverflow(this.stripValues);
        watchOverflow(this.stripAlarms);
        this.watchLayout(viewport);
        stage.labelMode = store.state.labels;
        store.on((s, prev) => this.onState(s, prev));
        def.sim.onChange(() => {
            this.renderHeader();
            if (this.store.state.mode !== 'sim')
                this.renderPanel();
        });
        onLangChange(() => this.renderAll());
        this.renderAll();
        this.updateInsets(false);
        this.warmLater(store.state.scene);
    }
    /** When the machine is idle, compile the shaders of a world (and of the section tool and the outline), a step at a time. */
    warmLater(scene) {
        const idle = window
            .requestIdleCallback;
        const later = (cb) => (idle ? idle.call(window, cb, { timeout: 2500 }) : window.setTimeout(cb, 600));
        later(() => {
            const stage = this.ctx.stage;
            const mod = stage.get(scene);
            const hook = this.def.onCutaway;
            const sim = this.def.sim;
            // the section tool changes the shaders (clipping planes): switch it on for the compile, then put it back. A world
            // applies it in its `update` (from `view.cutaway`) and/or through the lab's `onCutaway` hook; both are asked once.
            const view = (cutaway) => ({
                slowMo: sim.params.slowMo,
                cutaway,
                schematic: this.store.state.schematic,
                time: performance.now() / 1000,
            });
            const variant = mod && !this.store.state.cutaway
                ? () => {
                    hook?.(true, scene);
                    mod.update(sim.state, 0, view(true));
                    return () => {
                        hook?.(false, scene);
                        mod.update(sim.state, 0, view(false));
                    };
                }
                : undefined;
            const steps = stage.warmSteps(scene, variant);
            const next = () => {
                const step = steps.shift();
                if (!step)
                    return;
                step();
                later(next);
            };
            next();
        });
    }
    onState(s, prev) {
        const stage = this.ctx.stage;
        // a guide may move through several worlds: follow the step (the nested update renders everything)
        if ((s.step !== prev.step || s.mode !== prev.mode) && (s.mode === 'assembly' || s.mode === 'install')) {
            const g = guideDef(this.def, s.mode);
            const want = g && stepScene(g, Math.min(s.step, Math.max(0, g.steps.length - 1)));
            if (want && want !== s.scene) {
                this.store.set({ scene: want, selected: null, isolate: false, explode: 0 });
                return;
            }
        }
        if (s.scene !== prev.scene) {
            stage.setActive(s.scene);
            this.warmLater(s.scene);
            if (!this.visited.has(s.scene)) {
                this.visited.add(s.scene);
                requestAnimationFrame(() => stage.frameAll(0.01));
            }
        }
        if (s.selected !== prev.selected || s.scene !== prev.scene)
            stage.setSelection(s.selected);
        if (s.labels !== prev.labels) {
            stage.labelMode = s.labels;
            stage.refreshLabels();
        }
        if (s.cutaway !== prev.cutaway || s.scene !== prev.scene)
            this.applyCutaway();
        document.body.classList.toggle('sheet-open', s.sheet);
        document.body.classList.toggle('panel-closed', !s.panelOpen);
        document.body.classList.toggle('mode-plans', s.mode === 'plans');
        if (s.mode === 'plans' && (prev.mode !== 'plans' || s.drawing !== prev.drawing))
            this.showDrawing(false);
        if (s.panelOpen !== prev.panelOpen)
            requestAnimationFrame(() => stage.frameAll(0.4));
        const panelKeys = [
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
            if (!(s.mode === 'sim' && prev.mode === 'sim' && s.scene === prev.scene))
                this.renderPanel();
            this.renderRail();
            this.renderToolbar();
            this.renderHeader();
        }
        else {
            this.renderToolbar();
        }
        this.renderPeek();
        this.grip.setAttribute('aria-expanded', s.sheet ? 'true' : 'false');
        if (s.sheet !== prev.sheet || s.mode !== prev.mode)
            this.updateInsets();
    }
    // ------------------------------------------------------------ what covers the 3D view
    /**
     * On a phone the bottom sheet (and the toolbar that rides on it) covers the lower part of the 3D view; on a short
     * landscape screen the toolbar is a row at the top. The stage frames the subject in what is left.
     */
    watchLayout(viewport) {
        const update = () => this.updateInsets();
        new ResizeObserver(update).observe(viewport);
        new ResizeObserver(update).observe(this.toolbarRow);
        for (const q of [PHONE, SHORT])
            window.matchMedia(q).addEventListener('change', update);
        this.updateInsets(false);
    }
    updateInsets(animate = true) {
        const phone = window.matchMedia(PHONE).matches;
        const short = window.matchMedia(SHORT).matches;
        const tools = this.toolbar.offsetHeight;
        let top = 0;
        let bottom = 0;
        if (short)
            top = tools ? 8 + tools + 6 : 0; // the toolbar is a row at the top of the view
        if (phone) {
            // the sheet shows its whole height when open, only its grip when closed
            bottom = this.store.state.sheet ? this.panel.offsetHeight : this.grip.offsetHeight;
            if (!short && tools)
                bottom += 10 + tools + 8; // the toolbar rides on the sheet
        }
        this.ctx.stage.setViewInsets({ top, bottom, left: 0, right: 0 }, animate);
        // the toolbar floats over the view of a desktop layout: a narrow one keeps room for it (see Stage.setNarrowClearance)
        this.ctx.stage.setNarrowClearance(phone || short || !tools ? 0 : 14 + tools + 8, animate);
    }
    applyCutaway() {
        const s = this.store.state;
        this.def.onCutaway?.(s.cutaway, s.scene);
    }
    renderAll() {
        document.documentElement.lang = getLang();
        if (this.store.state.mode === 'plans')
            this.showDrawing(true);
        document.title = tr(this.def.brand.title);
        this.renderHeader();
        this.renderRail();
        this.renderPanel();
        this.renderToolbar();
        this.renderPeek();
        this.ctx.stage.refreshLabels();
    }
    // ------------------------------------------------------------ header
    renderHeader() {
        const s = this.store.state;
        const lessons = this.def.lessons?.items ?? [];
        const done = this.ctx.lessonsDone().size;
        fill(this.header, h('div', { class: 'brand' }, h('img', { src: this.def.brand.icon, alt: '', width: 34, height: 34 }), h('div', {}, h('h1', {}, tr(this.def.brand.title)), h('p', {}, tr(this.def.brand.tagline)))), h('div', { class: 'segmented scene-switch', role: 'tablist', 'aria-label': 'Scene' }, ...this.def.scenes.map(({ id, label }) => h('button', {
            class: s.scene === id ? 'is-active' : '',
            role: 'tab',
            'aria-selected': s.scene === id ? 'true' : 'false',
            onclick: () => this.ctx.gotoScene(id),
        }, tr(label)))), h('div', { class: 'topbar__right' }, lessons.length
            ? h('button', { class: 'progress', onclick: () => this.ctx.setMode('lessons') }, icon(ICONS.lessons, 16), h('span', {}, t('modeLessons')), h('b', {}, `${done}/${lessons.length}`), h('i', { style: `--p:${(done / lessons.length) * 100}%` }))
            : null, h('div', { class: 'segmented lang-switch' }, ...['fr', 'en'].map((l) => h('button', { class: getLang() === l ? 'is-active' : '', onclick: () => setLang(l) }, l.toUpperCase())))));
    }
    /** Modes with content in this lab (a mode without content is hidden, never reinvented). */
    availableModes() {
        const d = this.def;
        const has = {
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
    renderRail() {
        const s = this.store.state;
        fill(this.railScroll, ...this.availableModes().map(([mode, key, ic]) => h('button', {
            class: `rail__btn ${s.mode === mode ? 'is-active' : ''}`,
            'aria-label': t(key),
            'aria-pressed': s.mode === mode ? 'true' : 'false',
            onclick: () => {
                this.ctx.setMode(mode);
                this.store.set({ sheet: true, panelOpen: true });
            },
        }, icon(ICONS[ic], 21), h('span', {}, t(key)))));
        this.revealActiveMode();
    }
    /** Scroll the rail (a phone's row, or a short screen's column) so the current mode is in view. */
    revealActiveMode() {
        const sc = this.railScroll;
        const btn = sc.querySelector('.is-active');
        if (!btn || (sc.scrollWidth <= sc.clientWidth + 2 && sc.scrollHeight <= sc.clientHeight + 2))
            return;
        const b = btn.getBoundingClientRect();
        const c = sc.getBoundingClientRect();
        if (b.left < c.left + 8)
            sc.scrollLeft -= c.left + 8 - b.left;
        else if (b.right > c.right - 8)
            sc.scrollLeft += b.right - (c.right - 8);
        if (b.top < c.top + 8)
            sc.scrollTop -= c.top + 8 - b.top;
        else if (b.bottom > c.bottom - 8)
            sc.scrollTop += b.bottom - (c.bottom - 8);
    }
    renderPanel() {
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
    showDrawing(keepView) {
        const sheets = this.def.plans?.sheets ?? [];
        const sheet = sheets.find((x) => x.id === this.store.state.drawing) ?? sheets[0];
        if (sheet)
            this.viewer.show(sheet, keepView);
    }
    // ------------------------------------------------------------ viewport toolbar
    renderToolbar() {
        const s = this.store.state;
        const e = this.ctx.sim;
        const scene = this.ctx.sceneDef(s.scene);
        const guide = s.mode === 'assembly' || s.mode === 'install';
        const btn = (label, on, click, extra = '') => h('button', { class: `tool ${on ? 'is-on' : ''} ${extra}`, 'aria-pressed': on ? 'true' : 'false', onclick: click }, label);
        const nextLabels = { main: 'all', all: 'none', none: 'main' };
        const labelKey = { main: 'labelsMain', all: 'labelsAll', none: 'labelsNone' };
        const slow = SLOWMO.find(([v]) => v === e.params.slowMo) ?? SLOWMO[0];
        const sel = s.selected;
        fill(this.toolbarRow, h('button', {
            class: 'tool',
            onclick: () => this.ctx.overview(),
            title: t('overviewHint'),
        }, icon(ICONS.home, 16), h('span', {}, t('overviewBtn'))), guide
            ? null
            : h('div', { class: 'tool tool--range' }, h('button', { class: 'tool__mini', onclick: () => this.store.set({ explode: 0 }), title: t('assemble') }, '◀'), h('label', {}, t('explode')), h('input', {
                type: 'range',
                min: 0,
                max: 1,
                step: 0.01,
                value: s.explode,
                'aria-label': t('explode'),
                oninput: (ev) => this.store.set({ explode: Number(ev.target.value) }),
            }), h('button', { class: 'tool__mini', onclick: () => this.store.set({ explode: 1 }), title: t('disassemble') }, '▶')), guide || !sel
            ? null
            : btn(t('isolate'), s.isolate, () => {
                if (s.isolate)
                    return this.ctx.overview();
                this.store.set({ isolate: true });
                requestAnimationFrame(() => this.ctx.stage.frameParts([sel], 1.5));
            }), 
        // in the landscape, X-ray only makes sense around a selected part
        guide || (scene?.xrayNeedsSelection && !sel)
            ? null
            : btn(t('xray'), s.xray, () => this.store.set({ xray: !s.xray })), scene?.cutaway !== false ? btn(t('cutaway'), s.cutaway, () => this.store.set({ cutaway: !s.cutaway })) : null, btn(t('flows'), s.schematic, () => this.store.set({ schematic: !s.schematic })), btn(`${t('labels')}${colon()}${t(labelKey[s.labels])}`, s.labels !== 'none', () => this.store.set({ labels: nextLabels[s.labels] })), scene?.slowMo !== false
            ? btn(`${t('slowMo')} ${slow[1]}`, e.params.slowMo < 1, () => {
                const i = SLOWMO.findIndex(([v]) => v === e.params.slowMo);
                e.set({ slowMo: SLOWMO[(i + 1) % SLOWMO.length][0] });
                this.renderToolbar();
            })
            : null);
    }
    renderPeek() {
        const s = this.store.state;
        fill(this.panelToggle, icon(s.panelOpen ? ICONS.next : ICONS.prev, 16));
        this.panelToggle.setAttribute('aria-label', s.panelOpen ? t('hidePanel') : t('showPanel'));
        this.panelToggle.title = s.panelOpen ? t('hidePanel') : t('showPanel');
        const info = s.selected ? this.ctx.partInfo(s.selected) : undefined;
        // in explore mode the panel already shows the sheet, unless it is collapsed
        const show = !!info && (s.mode !== 'explore' || !s.panelOpen) && s.mode !== 'parts';
        this.peek.classList.toggle('is-visible', show);
        if (!show || !info)
            return;
        fill(this.peek, h('b', {}, tr(info.name)), h('p', {}, rich(tr(info.short))), h('div', { class: 'actions' }, h('button', {
            class: 'btn btn--small',
            onclick: () => {
                this.ctx.selectPart(info.id, { mode: 'explore', frame: false });
                this.store.set({ panelOpen: true });
            },
        }, t('overview')), h('button', {
            class: `btn btn--small ${s.isolate ? 'is-on' : ''}`,
            onclick: () => {
                this.store.set({ isolate: !s.isolate });
                requestAnimationFrame(() => s.isolate ? this.ctx.stage.frameAll() : this.ctx.stage.frameParts([info.id], 1.5));
            },
        }, s.isolate ? t('showAll') : t('isolate')), h('button', { class: 'icon-btn', 'aria-label': t('close'), onclick: () => this.store.set({ selected: null }) }, icon(ICONS.close, 16))));
    }
    // ------------------------------------------------------------ live strip
    renderStrip() {
        const sim = this.ctx.sim;
        const p = sim.params;
        const strip = this.def.strip;
        const speeds = strip.speeds ?? SPEEDS;
        fill(this.stripValues, ...strip
            .values(sim)
            .map((v) => h('div', { class: `live ${v.cls ?? ''}` }, h('span', {}, v.label), h('b', {}, v.value, h('small', {}, ` ${v.unit}`)))));
        const clock = strip.clock(sim);
        fill(this.stripClock, h('button', {
            class: 'icon-btn',
            'aria-label': p.running ? t('pause') : t('play'),
            onclick: () => sim.set({ running: !p.running }),
        }, icon(p.running ? ICONS.pause : ICONS.play, 16)), h('div', { class: 'clock' }, h('b', {}, clock.time), h('small', {}, clock.sub)), h('div', { class: 'segmented segmented--tiny', 'aria-label': t('speed') }, ...speeds.map((sp) => h('button', {
            class: p.timeScale === sp ? 'is-active' : '',
            onclick: () => sim.set({ timeScale: sp }),
            title: sp === 1 ? t('realTime') : '',
        }, sp === 1 ? '×1' : `×${sp}`))));
        // the worst first (a stable sort keeps the lab's order inside each group)
        const alarms = strip
            .alarms(sim)
            .slice()
            .sort((a, b) => Number(!!b.severe) - Number(!!a.severe));
        const key = alarms.map((a) => a.label).join('|');
        if (key !== this.lastAlarmKey) {
            this.lastAlarmKey = key;
            this.strip.classList.toggle('has-alarm', alarms.length > 0);
            fill(this.stripAlarms, ...(alarms.length
                ? alarms.map((a) => h('span', { class: `alarm ${a.severe ? 'alarm--severe' : ''}` }, icon(ICONS.warn, 14), a.label))
                : [h('span', { class: 'alarm alarm--ok' }, icon(ICONS.ok, 14), t('allGood'))]));
        }
    }
    /** Per-frame UI work (throttled). */
    tick(dt) {
        this.lastStrip += dt;
        if (this.lastStrip > 0.2) {
            this.lastStrip = 0;
            this.renderStrip();
        }
        if (this.store.state.mode === 'sim')
            this.simPanel?.tick(dt);
        this.display.update(dt);
    }
}
