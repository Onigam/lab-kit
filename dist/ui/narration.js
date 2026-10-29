import { getLang, onLangChange } from '../i18n';
import { CueClock, captionAt, cueKind, findSegment, readManifest, scopeId, scopeKind, splitCaptions, } from '../narration';
import { hasMode } from './context';
// The spoken guide: plays a pre-rendered segment (docs/narration.md) and makes the 3D view follow what is said. The audio
// element is the clock; the cues run through the same code paths as the buttons of the interface (the context, the store and
// the stage). Everything about the screen (buttons, transport bar, subtitles) is in narration-ui.ts.
/** Playback speeds offered by the transport bar. */
export const NARRATION_SPEEDS = [1, 1.25, 1.5];
/** Length of a camera flight, in seconds. */
const FLIGHT = 0.9;
const FLIGHT_REDUCED = 0.3;
export class NarrationEngine {
    ctx;
    config;
    lang = getLang();
    manifest = null;
    manifestUrl = null;
    /** Manifests already asked for, by URL (`null`: not there). */
    cache = new Map();
    loading = new Map();
    audioEl = null;
    audioUrl = '';
    clock = null;
    chunks = [];
    maxChars = 70;
    raf = 0;
    /** > 0 while the engine itself changes the interface, so the store listener does not take it for the visitor. */
    applying = 0;
    /** Bumped when the segment changes or stops: a camera move planned before is no longer wanted. */
    generation = 0;
    startMode = 'explore';
    warned = new Set();
    listeners = new Set();
    teardown = [];
    offLang = null;
    started = false;
    destroyed = false;
    state = {
        status: 'idle',
        scope: null,
        segment: null,
        position: 0,
        duration: 0,
        speed: 1,
        subtitles: true,
        guidance: true,
        suspended: false,
        caption: '',
        error: null,
    };
    constructor(ctx, config) {
        this.ctx = ctx;
        this.config = config;
        Object.assign(this.state, this.loadPrefs());
    }
    // ------------------------------------------------------------ the manifest
    /** Begin loading the manifest of the current language; follows the language from then on. */
    start() {
        if (this.started || this.destroyed)
            return;
        this.started = true;
        this.offLang = onLangChange((lang) => {
            this.close();
            this.lang = lang;
            this.refresh();
        });
        // the manifest is a small file: ask for it now, the answer comes when it comes (the buttons appear with it)
        this.refresh();
    }
    /** The narration is offered: the manifest of the current language is loaded and has segments. */
    get ready() {
        return !!this.manifest;
    }
    /** The mention of the synthetic voice, in the interface language. */
    get voiceLabel() {
        const label = this.manifest?.voiceLabel;
        return (this.lang === 'fr' ? label?.fr : label?.en) ?? '';
    }
    segment(scope) {
        return findSegment(this.manifest, scope);
    }
    /** The segment can be played here: it exists in the manifest and what it is about exists in the lab. */
    has(scope) {
        const seg = this.segment(scope);
        if (!seg)
            return false;
        const id = scopeId(scope);
        switch (scopeKind(scope)) {
            case 'scene':
                return !!this.ctx.sceneDef(id);
            case 'part':
                return !!this.ctx.partInfo(id);
            case 'lesson':
                return !!this.ctx.def.lessons?.items.some((l) => l.id === id);
            default:
                return true;
        }
    }
    urlFor(lang) {
        const m = this.config.manifest;
        const raw = typeof m === 'function' ? m(lang) : m.replace('{lang}', lang);
        return raw ? new URL(raw, document.baseURI).href : null;
    }
    refresh() {
        if (this.destroyed)
            return;
        const lang = this.lang;
        const url = this.urlFor(lang);
        this.manifestUrl = url;
        const before = this.manifest;
        const use = (m) => {
            // a manifest that says it is in another language than the interface is not offered (a single URL for both languages)
            this.manifest = m && (!m.lang || m.lang === lang) ? m : null;
        };
        if (!url) {
            this.manifest = null;
        }
        else if (this.cache.has(url)) {
            use(this.cache.get(url) ?? null);
        }
        else {
            this.manifest = null;
            if (!this.loading.has(url)) {
                this.loading.set(url, fetch(url)
                    .then((r) => (r.ok ? r.json() : null))
                    .catch(() => null)
                    .then((raw) => {
                    const { manifest, problems } = raw ? readManifest(raw) : { manifest: null, problems: [] };
                    if (problems.length)
                        console.warn('[lab-kit] narration manifest:', ...problems);
                    this.cache.set(url, manifest);
                    this.loading.delete(url);
                    if (!this.destroyed && url === this.manifestUrl) {
                        use(manifest);
                        this.emit('ready');
                    }
                }));
            }
        }
        if (before !== this.manifest)
            this.emit('ready');
    }
    // ------------------------------------------------------------ events
    onChange(fn) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }
    emit(event) {
        for (const fn of [...this.listeners])
            fn(event);
    }
    // ------------------------------------------------------------ preferences
    get prefsKey() {
        return `${this.ctx.def.id}:narration`;
    }
    /** The key that remembers, per lab, that the visitor has been invited to the introduction (or used the guide). */
    get invitedKey() {
        return `${this.ctx.def.id}:narration-invited`;
    }
    invitedInMemory = false;
    /**
     * The visitor has already been invited to the spoken guide, or has used it: the invitation of the header never comes
     * back. Kept in the browser; without storage it lasts for the visit.
     */
    get invited() {
        if (this.invitedInMemory)
            return true;
        try {
            return localStorage.getItem(this.invitedKey) === '1';
        }
        catch {
            return false;
        }
    }
    /** Remember that the invitation has been seen (dismissed, accepted, or the guide played). */
    markInvited() {
        if (this.invited)
            return;
        this.invitedInMemory = true;
        try {
            localStorage.setItem(this.invitedKey, '1');
        }
        catch {
            /* storage unavailable: the invitation is just not shown again during this visit */
        }
        this.emit('state');
    }
    loadPrefs() {
        try {
            const p = JSON.parse(localStorage.getItem(this.prefsKey) ?? '{}');
            return {
                ...(typeof p.subtitles === 'boolean' ? { subtitles: p.subtitles } : {}),
                ...(typeof p.guidance === 'boolean' ? { guidance: p.guidance } : {}),
                ...(NARRATION_SPEEDS.includes(p.speed) ? { speed: p.speed } : {}),
            };
        }
        catch {
            return {};
        }
    }
    savePrefs() {
        const { subtitles, guidance, speed } = this.state;
        try {
            localStorage.setItem(this.prefsKey, JSON.stringify({ subtitles, guidance, speed }));
        }
        catch {
            /* storage unavailable: the choices are just not kept */
        }
    }
    setSubtitles(on) {
        this.state.subtitles = on;
        this.savePrefs();
        this.emit('state');
    }
    setSpeed(speed) {
        this.state.speed = speed;
        this.savePrefs();
        if (this.audioEl)
            this.audioEl.playbackRate = this.audioEl.defaultPlaybackRate = speed;
        this.emit('state');
    }
    /** The "3D guidance" switch. Switching it on applies the state of the current position at once. */
    setGuidance(on) {
        this.state.guidance = on;
        this.savePrefs();
        if (on) {
            this.state.suspended = false;
            this.replay();
        }
        else {
            this.generation++;
            this.setEmphasis([]);
        }
        this.emit('state');
    }
    /** The visitor took control and wants the narrator back: apply the state of the current position and go on. */
    resumeGuidance() {
        if (!this.state.segment)
            return;
        this.state.suspended = false;
        this.replay();
        this.emit('state');
    }
    /** Room for the subtitles, in characters (two lines): longer captions are cut into pieces that follow the voice. */
    setCaptionRoom(maxChars) {
        maxChars = Math.max(24, Math.round(maxChars));
        if (maxChars === this.maxChars)
            return;
        this.maxChars = maxChars;
        if (this.state.segment) {
            this.chunks = splitCaptions(this.state.segment.captions, maxChars);
            this.updateCaption();
        }
    }
    // ------------------------------------------------------------ transport
    audio() {
        if (this.audioEl)
            return this.audioEl;
        const a = new Audio();
        a.preload = 'auto';
        this.audioEl = a;
        a.addEventListener('playing', () => {
            if (!this.state.segment || this.state.status === 'ended')
                return;
            this.state.status = 'playing';
            this.state.error = null;
            this.syncDuration();
            this.emit('state');
            this.loop();
        });
        a.addEventListener('pause', () => {
            if (!this.state.segment || a.ended || this.state.status === 'ended' || this.state.status === 'error')
                return;
            if (this.state.status === 'playing') {
                this.tick(); // the cues up to the point where it stopped
                this.state.status = 'paused';
                this.emit('state');
            }
        });
        a.addEventListener('waiting', () => {
            if (this.state.status === 'playing') {
                this.state.status = 'loading';
                this.emit('state');
            }
        });
        a.addEventListener('loadedmetadata', () => this.syncDuration());
        a.addEventListener('durationchange', () => this.syncDuration());
        a.addEventListener('timeupdate', () => this.tick()); // the frame loop is paused in a hidden tab, this one is not
        a.addEventListener('ended', () => this.onEnded());
        a.addEventListener('error', () => {
            if (!this.state.segment)
                return;
            this.fail('unavailable');
        });
        return a;
    }
    /** Play a segment from its start (the one playing, if any, stops). Call it from a click: the browser lets it start. */
    play(scope) {
        const seg = this.segment(scope);
        if (!seg || this.destroyed)
            return;
        this.markInvited();
        this.closeQuietly();
        const s = this.state;
        s.scope = scope;
        s.segment = seg;
        s.status = 'loading';
        s.suspended = false;
        s.error = null;
        s.position = 0;
        s.duration = seg.duration;
        s.caption = '';
        this.chunks = splitCaptions(seg.captions, this.maxChars);
        this.clock = new CueClock(seg.cues);
        this.generation++;
        this.attach();
        // "plans" and the guides take over the display of the parts: the narration starts from the explorer
        this.applying++;
        try {
            if (this.ctx.ui.mode === 'plans' || this.ctx.ui.mode === 'assembly' || this.ctx.ui.mode === 'install') {
                this.ctx.setMode('explore');
            }
        }
        finally {
            this.applying--;
        }
        this.startMode = this.ctx.ui.mode;
        const a = this.audio();
        const url = new URL(seg.file, this.manifestUrl ?? document.baseURI).href;
        a.playbackRate = a.defaultPlaybackRate = s.speed;
        if (this.audioUrl !== url || a.error) {
            this.audioUrl = url;
            a.src = url;
        }
        else {
            a.currentTime = 0;
        }
        a.play().catch((err) => this.onPlayRejected(err));
        this.replay(0);
        this.emit('state');
        this.loop();
    }
    onPlayRejected(err) {
        if (!this.state.segment)
            return;
        const name = err?.name;
        if (name === 'AbortError')
            return; // another play() or a seek interrupted it
        if (name === 'NotAllowedError') {
            // the browser wants a click on the play button
            this.state.status = 'paused';
            this.state.error = 'blocked';
            this.emit('state');
        }
        else {
            this.fail('unavailable');
        }
    }
    fail(error) {
        this.state.status = 'error';
        this.state.error = error;
        this.state.caption = '';
        this.generation++;
        this.emit('state');
    }
    /** Play or pause; after the end, play again from the start. */
    toggle() {
        const s = this.state;
        if (!s.segment)
            return;
        if (s.status === 'ended' || s.status === 'error') {
            if (s.scope)
                this.play(s.scope);
        }
        else if (s.status === 'paused') {
            this.audio()
                .play()
                .catch((err) => this.onPlayRejected(err));
        }
        else {
            this.audio().pause();
            if (s.status === 'loading') {
                s.status = 'paused';
                this.emit('state');
            }
        }
    }
    /** Move to `seconds`; the state of the 3D view at that point is rebuilt (guidance on). */
    seek(seconds) {
        const s = this.state;
        if (!s.segment || s.status === 'error')
            return;
        const t = Math.min(Math.max(0, seconds), Math.max(0, s.duration - 0.01));
        const a = this.audio();
        a.currentTime = t;
        s.position = t;
        if (s.status === 'ended') {
            s.status = 'paused';
            this.generation++;
        }
        this.replay(t);
        this.updateCaption();
        this.emit('state');
        this.emit('time');
    }
    onEnded() {
        const s = this.state;
        if (!s.segment)
            return;
        this.tick(); // the cues up to the very end
        // the markers after the last word (an "off" that closes the segment) are timed at the end of the aligned text, a hair after the
        // end of the decoded audio: run what is left so the 3D view ends in the state the script describes
        if (this.clock)
            this.run(this.clock.finish().cues.map((c) => c.do));
        s.status = 'ended';
        s.position = s.duration;
        s.caption = '';
        this.emit('state');
        this.emit('time');
    }
    /** Stop and hide the transport bar. The 3D view stays as it is. */
    close() {
        if (!this.state.segment)
            return;
        this.closeQuietly();
        this.emit('state');
    }
    closeQuietly() {
        const s = this.state;
        this.generation++;
        cancelAnimationFrame(this.raf);
        this.raf = 0;
        this.audioEl?.pause();
        this.detach();
        this.setEmphasis([]);
        s.status = 'idle';
        s.scope = null;
        s.segment = null;
        s.position = 0;
        s.duration = 0;
        s.caption = '';
        s.suspended = false;
        s.error = null;
        this.clock = null;
        this.chunks = [];
    }
    /** Release everything: the audio, the listeners, the frame loop. */
    destroy() {
        if (this.destroyed)
            return;
        this.closeQuietly();
        this.destroyed = true;
        this.offLang?.();
        this.listeners.clear();
        if (this.audioEl) {
            this.audioEl.removeAttribute('src');
            this.audioEl.load();
            this.audioEl = null;
        }
    }
    syncDuration() {
        const a = this.audioEl;
        if (!a || !this.state.segment)
            return;
        if (Number.isFinite(a.duration) && a.duration > 0 && Math.abs(a.duration - this.state.duration) > 0.05) {
            this.state.duration = a.duration;
            this.emit('time');
        }
    }
    // ------------------------------------------------------------ the clock
    loop = () => {
        cancelAnimationFrame(this.raf);
        this.raf = 0;
        const st = this.state.status;
        if (st !== 'playing' && st !== 'loading')
            return;
        this.tick();
        this.raf = requestAnimationFrame(this.loop);
    };
    /** Read the audio clock: the position, the subtitle and the cues passed since the last reading. */
    tick() {
        const s = this.state;
        const a = this.audioEl;
        if (!a || !s.segment || !this.clock)
            return;
        if (s.status !== 'playing' && s.status !== 'ended' && s.status !== 'loading')
            return;
        const t = a.currentTime;
        if (t === s.position && s.status !== 'ended')
            return;
        s.position = t;
        if (this.guided) {
            const step = this.clock.advance(t);
            if (step.replay)
                this.applyState(step.cues.map((c) => c.do));
            else if (step.cues.length)
                this.run(step.cues.map((c) => c.do));
        }
        else {
            this.clock.advance(t);
        }
        this.updateCaption();
        this.emit('time');
    }
    updateCaption() {
        const s = this.state;
        const c = s.segment && s.status !== 'ended' && s.status !== 'error' ? captionAt(this.chunks, s.position) : null;
        const text = c?.text ?? '';
        if (text !== s.caption) {
            s.caption = text;
            this.emit('state');
        }
    }
    // ------------------------------------------------------------ guidance: cues on the 3D view
    /** The cues are applied: the switch is on and the visitor has not taken over. */
    get guided() {
        return this.state.guidance && !this.state.suspended;
    }
    /** Rebuild the 3D state at `t` (default: the current position). */
    replay(t = this.state.position) {
        const seg = this.state.segment;
        if (!seg || !this.clock)
            return;
        const step = this.clock.seek(t);
        if (this.guided)
            this.applyState(step.cues.map((c) => c.do));
    }
    /**
     * The state at the start of the segment, then the last cue of each kind up to now. What the segment's cues touch goes back
     * to its starting value first, so a seek backwards undoes what a later cue did.
     */
    applyState(folded) {
        const seg = this.state.segment;
        if (!seg)
            return;
        const kinds = new Set(seg.cues.map((c) => cueKind(c.do)));
        const base = [];
        const kind = scopeKind(seg.scope);
        const id = scopeId(seg.scope);
        const foldsScene = folded.some((a) => 'scene' in a);
        if (kind === 'part') {
            if (seg.scene && !foldsScene)
                base.push({ scene: seg.scene });
            if (this.ctx.partInfo(id))
                base.push({ select: id });
        }
        else {
            const lesson = kind === 'lesson' ? this.ctx.def.lessons?.items.find((l) => l.id === id) : undefined;
            const world = seg.scene ?? (kind === 'scene' ? id : lesson?.focus.scene);
            if (world && !foldsScene)
                base.push({ scene: world });
            base.push({ select: lesson?.focus.part ?? null }, { isolate: false }, { home: true });
        }
        if (kinds.has('explode'))
            base.push({ explode: 0 });
        if (kinds.has('xray'))
            base.push({ xray: false });
        if (kinds.has('cutaway'))
            base.push({ cutaway: false });
        if (kinds.has('flows'))
            base.push({ flows: false });
        if (kinds.has('isolate') && kind === 'part')
            base.push({ isolate: false });
        if (kinds.has('mode'))
            base.push({ mode: this.startMode });
        this.run([...base, ...folded]);
    }
    /** Apply actions in order, then move the camera once, to where the last of them wants it. */
    run(actions) {
        if (!this.guided || !actions.length)
            return;
        const batch = { framing: null, emphasis: undefined, settle: false };
        this.applying++;
        try {
            for (const a of actions) {
                try {
                    this.apply(a, batch);
                }
                catch (err) {
                    console.warn('[lab-kit] narration cue failed:', a, err);
                }
            }
        }
        finally {
            this.applying--;
        }
        if (batch.emphasis)
            this.setEmphasis(batch.emphasis);
        const framing = batch.framing;
        if (!framing)
            return;
        const gen = this.generation;
        const go = () => {
            if (gen !== this.generation || !this.guided)
                return;
            const dur = this.flight();
            const stage = this.ctx.stage;
            if (framing.kind === 'all')
                stage.frameAll(dur);
            else
                stage.frameParts(framing.ids, framing.padding, undefined, dur);
        };
        // the display follows the store a frame later: the camera measures after it
        let frames = batch.settle ? 2 : 1;
        const wait = () => requestAnimationFrame(() => {
            if (--frames > 0)
                wait();
            else
                go();
        });
        wait();
    }
    flight() {
        return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? FLIGHT_REDUCED : FLIGHT;
    }
    warnOnce(key, message) {
        if (this.warned.has(key))
            return;
        this.warned.add(key);
        console.warn(`[lab-kit] narration: ${message}`);
    }
    setEmphasis(ids) {
        this.ctx.stage.setEmphasis(ids);
    }
    /**
     * Camera padding for the parts the narrator points at: closer than when a part is clicked (the narrator wants the view to
     * zoom and focus), never further than the world's own `partPadding`.
     */
    framePadding(count) {
        const world = this.ctx.sceneDef(this.ctx.ui.scene)?.partPadding ?? 2.4;
        return Math.min(world, count > 1 ? 1.5 : 1.9);
    }
    apply(a, batch) {
        const ctx = this.ctx;
        const store = ctx.store;
        const ui = () => store.state;
        if ('scene' in a) {
            if (!ctx.sceneDef(a.scene))
                return this.warnOnce(`scene:${a.scene}`, `unknown world "${a.scene}"`);
            if (a.scene === ui().scene)
                return;
            ctx.gotoScene(a.scene);
            batch.framing = { kind: 'all' };
            batch.emphasis = [];
            batch.settle = true;
        }
        else if ('home' in a) {
            if (ui().isolate)
                store.set({ isolate: false });
            batch.framing = { kind: 'all' };
            batch.emphasis = [];
            batch.settle = true;
        }
        else if ('frame' in a) {
            const known = a.frame.filter((id) => {
                const ok = !!ctx.partInfo(id);
                if (!ok)
                    this.warnOnce(`part:${id}`, `unknown part "${id}"`);
                return ok;
            });
            if (!known.length)
                return;
            const world = ctx.partInfo(known[0])?.scene;
            if (world && world !== ui().scene)
                ctx.gotoScene(world);
            const ids = known.filter((id) => ctx.stage.active.registry.get(id));
            if (!ids.length)
                return this.warnOnce(`frame:${known[0]}`, `"${known[0]}" is not in the world "${ui().scene}"`);
            batch.framing = { kind: 'parts', ids, padding: this.framePadding(ids.length) };
            batch.emphasis = ids;
            batch.settle = true;
        }
        else if ('select' in a) {
            if (a.select === null) {
                if (ui().selected !== null)
                    ctx.selectPart(null, { frame: false });
                return;
            }
            if (!ctx.partInfo(a.select))
                return this.warnOnce(`part:${a.select}`, `unknown part "${a.select}"`);
            ctx.selectPart(a.select, { frame: false });
            batch.framing = { kind: 'parts', ids: [a.select], padding: this.framePadding(1) };
            batch.emphasis = [];
            batch.settle = true;
        }
        else if ('explode' in a) {
            if (ui().explode !== a.explode)
                store.set({ explode: a.explode });
            batch.settle = true;
        }
        else if ('xray' in a) {
            if (ui().xray !== a.xray)
                store.set({ xray: a.xray });
        }
        else if ('cutaway' in a) {
            if (a.cutaway && ctx.sceneDef(ui().scene)?.cutaway === false) {
                return this.warnOnce(`cutaway:${ui().scene}`, `the world "${ui().scene}" has no section`);
            }
            if (ui().cutaway !== a.cutaway)
                store.set({ cutaway: a.cutaway });
        }
        else if ('flows' in a) {
            if (ui().schematic !== a.flows)
                store.set({ schematic: a.flows });
        }
        else if ('isolate' in a) {
            if (a.isolate) {
                const sel = ui().selected;
                if (!sel)
                    return this.warnOnce('isolate', 'isolate needs a selected part');
                if (!ui().isolate)
                    store.set({ isolate: true });
                batch.framing = { kind: 'parts', ids: [sel], padding: 1.5 };
                batch.settle = true;
            }
            else if (ui().isolate) {
                store.set({ isolate: false });
                batch.framing = { kind: 'all' };
                batch.settle = true;
            }
        }
        else if ('mode' in a) {
            if (!hasMode(ctx.def, a.mode))
                return this.warnOnce(`mode:${a.mode}`, `the lab has no mode "${a.mode}"`);
            if (ui().mode !== a.mode)
                ctx.setMode(a.mode);
            batch.settle = true;
        }
        else {
            this.config.onCue?.(ctx, a.lab, a.arg);
        }
    }
    // ------------------------------------------------------------ the visitor takes over
    attach() {
        if (this.teardown.length)
            return;
        const ctx = this.ctx;
        this.teardown.push(ctx.store.on((s, prev) => {
            if (this.applying || !this.state.segment)
                return;
            if (s.scene !== prev.scene || s.mode !== prev.mode || s.selected !== prev.selected)
                this.visitorChanged();
        }), ctx.stage.onUserCamera(() => {
            if (!this.applying && this.state.segment)
                this.visitorChanged(true);
        }));
        const key = (e) => {
            if (e.key === 'Escape' && this.state.segment)
                this.close();
        };
        document.addEventListener('keydown', key);
        this.teardown.push(() => document.removeEventListener('keydown', key));
    }
    detach() {
        for (const off of this.teardown.splice(0))
            off();
    }
    /**
     * The visitor moved the camera (`camera`), or changed the world, the mode or the selected part by hand. A part's narration
     * is about that part's sheet: leaving it ends the narration. Any other keeps playing without the guidance, which the
     * visitor can ask back.
     */
    visitorChanged(camera = false) {
        const s = this.state;
        if (!s.segment || s.status === 'ended' || s.status === 'error')
            return;
        if (!camera && scopeKind(s.segment.scope) === 'part') {
            this.close();
            return;
        }
        if (s.suspended || !s.guidance)
            return;
        s.suspended = true;
        this.generation++;
        this.setEmphasis([]);
        this.emit('state');
    }
}
