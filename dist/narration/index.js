// The pure part of the spoken guide (docs/narration.md): the manifest types, its validation and the cue scheduling.
// No DOM, no three.js, no import: a lab test or a node tool can import this module (`@onigam/lab-kit/narration`).
// ---------------------------------------------------------------- scopes
const SCOPE = /^(intro|(scene|part|lesson):.+)$/;
export function isScope(value) {
    return typeof value === 'string' && SCOPE.test(value);
}
/** `scene`, `part`, `lesson` or `intro`. */
export function scopeKind(scope) {
    return scope === 'intro' ? 'intro' : scope.slice(0, scope.indexOf(':'));
}
/** The id after the colon (`part:nozzle` gives `nozzle`); empty for `intro`. */
export function scopeId(scope) {
    return scope === 'intro' ? '' : scope.slice(scope.indexOf(':') + 1);
}
export function findSegment(manifest, scope) {
    return manifest?.segments.find((s) => s.scope === scope);
}
// ---------------------------------------------------------------- reading a manifest
const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const str = (v) => typeof v === 'string' && v.length > 0;
/** One cue action of the manifest, checked; `null` when it is none of the known shapes. */
export function readAction(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    const r = raw;
    if (str(r.scene))
        return { scene: r.scene };
    if (r.home === true)
        return { home: true };
    if (Array.isArray(r.frame) && r.frame.length && r.frame.every(str))
        return { frame: [...r.frame] };
    if ('select' in r && (r.select === null || str(r.select)))
        return { select: r.select };
    if (finite(r.explode))
        return { explode: Math.min(1, Math.max(0, r.explode)) };
    if (typeof r.xray === 'boolean')
        return { xray: r.xray };
    if (typeof r.cutaway === 'boolean')
        return { cutaway: r.cutaway };
    if (typeof r.flows === 'boolean')
        return { flows: r.flows };
    if (typeof r.isolate === 'boolean')
        return { isolate: r.isolate };
    if (str(r.mode))
        return { mode: r.mode };
    if (str(r.lab))
        return typeof r.arg === 'string' ? { lab: r.lab, arg: r.arg } : { lab: r.lab };
    return null;
}
/**
 * Read a manifest.json: keep what is usable and say what is not. A segment without a valid id, scope, file and duration is
 * dropped; a malformed caption or cue is dropped; cues are sorted by time (stable). `manifest` is `null` when there is no
 * usable segment.
 */
export function readManifest(raw) {
    const problems = [];
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.segments)) {
        return { manifest: null, problems: ['not a manifest: no "segments" list'] };
    }
    const m = raw;
    const label = (m.voiceLabel ?? {});
    const segments = [];
    const seen = new Set();
    for (const [i, rs] of m.segments.entries()) {
        const s = (rs ?? {});
        const where = `segment ${i}${str(s.id) ? ` (${s.id})` : ''}`;
        if (!str(s.id) || !isScope(s.scope) || !str(s.file) || !finite(s.duration) || s.duration <= 0) {
            problems.push(`${where}: needs id, scope, file and a duration`);
            continue;
        }
        if (seen.has(s.scope)) {
            problems.push(`${where}: scope ${s.scope} appears twice`);
            continue;
        }
        seen.add(s.scope);
        const captions = [];
        for (const rc of Array.isArray(s.captions) ? s.captions : []) {
            const c = (rc ?? {});
            if (finite(c.t0) && finite(c.t1) && c.t1 > c.t0 && str(c.text))
                captions.push({ t0: c.t0, t1: c.t1, text: c.text });
            else
                problems.push(`${where}: malformed caption`);
        }
        captions.sort((a, b) => a.t0 - b.t0);
        const cues = [];
        for (const rc of Array.isArray(s.cues) ? s.cues : []) {
            const c = (rc ?? {});
            const action = finite(c.t) && c.t >= 0 ? readAction(c.do) : null;
            if (action)
                cues.push({ t: c.t, do: action });
            else
                problems.push(`${where}: malformed cue ${JSON.stringify(rc)}`);
        }
        cues.sort((a, b) => a.t - b.t); // Array.prototype.sort is stable: cues at the same time keep the script order
        segments.push({
            id: s.id,
            scope: s.scope,
            title: typeof s.title === 'string' ? s.title : '',
            ...(str(s.scene) ? { scene: s.scene } : {}),
            file: s.file,
            duration: s.duration,
            captions,
            cues,
        });
    }
    if (!segments.length)
        return { manifest: null, problems: [...problems, 'no usable segment'] };
    return {
        manifest: {
            lang: typeof m.lang === 'string' ? m.lang : '',
            voiceLabel: {
                fr: typeof label.fr === 'string' ? label.fr : 'Voix de synthèse',
                en: typeof label.en === 'string' ? label.en : 'Synthetic voice',
            },
            segments,
        },
        problems,
    };
}
export const NARRATION_MODES = ['explore', 'assembly', 'install', 'sim', 'plans', 'lessons', 'parts', 'about'];
/**
 * The problems of a manifest against a lab, for the lab's own test: every scope, `scene`, cue id and mode must exist; a
 * `part:` segment must have its part and the audio duration must be sane. An empty list means all good.
 */
export function validateManifest(manifest, known) {
    const out = [];
    const scenes = new Set(known.scenes);
    const parts = new Set(known.parts);
    const lessons = new Set(known.lessons ?? []);
    const modes = new Set(known.modes ?? NARRATION_MODES);
    for (const seg of manifest.segments) {
        const at = `${seg.scope}`;
        const kind = scopeKind(seg.scope);
        const id = scopeId(seg.scope);
        if (kind === 'scene' && !scenes.has(id))
            out.push(`${at}: unknown world "${id}"`);
        if (kind === 'part' && !parts.has(id))
            out.push(`${at}: unknown part "${id}"`);
        if (kind === 'lesson' && known.lessons && !lessons.has(id))
            out.push(`${at}: unknown lesson "${id}"`);
        if (seg.scene && !scenes.has(seg.scene))
            out.push(`${at}: unknown starting world "${seg.scene}"`);
        const last = seg.cues[seg.cues.length - 1];
        if (last && last.t > seg.duration + 0.5)
            out.push(`${at}: a cue at ${last.t}s is after the end (${seg.duration}s)`);
        for (const cue of seg.cues) {
            const a = cue.do;
            const t = `${at} @${cue.t}s`;
            if ('scene' in a && !scenes.has(a.scene))
                out.push(`${t}: unknown world "${a.scene}"`);
            if ('frame' in a)
                for (const p of a.frame)
                    if (!parts.has(p))
                        out.push(`${t}: unknown part "${p}"`);
            if ('select' in a && a.select !== null && !parts.has(a.select))
                out.push(`${t}: unknown part "${a.select}"`);
            if ('mode' in a && !modes.has(a.mode))
                out.push(`${t}: unknown mode "${a.mode}"`);
        }
    }
    return out;
}
// ---------------------------------------------------------------- cues on the audio clock
/**
 * The kind of a cue: a later cue of the same kind replaces an earlier one when a seek replays the state. Framings
 * (`frame`, `home`) share one kind: the camera can only be in one place.
 */
export function cueKind(a) {
    if ('scene' in a)
        return 'scene';
    if ('home' in a || 'frame' in a)
        return 'camera';
    if ('select' in a)
        return 'select';
    if ('explode' in a)
        return 'explode';
    if ('xray' in a)
        return 'xray';
    if ('cutaway' in a)
        return 'cutaway';
    if ('flows' in a)
        return 'flows';
    if ('isolate' in a)
        return 'isolate';
    if ('mode' in a)
        return 'mode';
    return `lab:${a.lab}`; // one state per hook name (preset, scenario, time…)
}
/** The cues whose time is after `from` and not after `to`, in order (`cues` sorted by time). */
export function dueCues(cues, from, to) {
    return cues.filter((c) => c.t > from && c.t <= to);
}
/**
 * The state at time `t`: the last cue of each kind at or before `t`, in the order they were given (so a scene change comes
 * before the selection that followed it).
 */
export function replayCues(cues, t) {
    const last = new Map();
    cues.forEach((c, i) => {
        if (c.t <= t)
            last.set(cueKind(c.do), i);
    });
    return [...last.values()].sort((a, b) => a - b).map((i) => cues[i]);
}
/** The caption to show at time `t` (none in a gap between two captions or after the last). */
export function captionAt(captions, t) {
    for (const c of captions) {
        if (t >= c.t0 && t < c.t1)
            return c;
        if (c.t0 > t)
            break;
    }
    return null;
}
/** A position that moves backwards by more than this (seconds) is a seek. */
export const BACK_JUMP = 0.05;
/** A position that moves forward by more than this (seconds) in one reading is a seek, or a tab that slept. */
export const FORWARD_JUMP = 1.5;
/**
 * Follows the audio clock: give it each reading of `currentTime` and it says which cues to run. Normal playback gives the
 * cues that were passed since the last reading; a jump (seek, a tab that was asleep) gives the state to rebuild instead of a
 * burst of every cue that was skipped.
 */
export class CueClock {
    last = 0;
    cues;
    // (no parameter property: Node can run this file as it is, see tools/narration/selftest.mjs)
    constructor(cues) {
        this.cues = cues;
    }
    /** Start (or seek) at `t`: the state at `t`. */
    seek(t) {
        this.last = t;
        return { replay: true, cues: replayCues(this.cues, t) };
    }
    /** The audio clock now reads `t`. */
    advance(t) {
        const last = this.last;
        if (t < last - BACK_JUMP || t - last > FORWARD_JUMP)
            return this.seek(t);
        this.last = Math.max(last, t);
        return { replay: false, cues: dueCues(this.cues, last, t) };
    }
    /**
     * The audio ended: the cues still to run, including the ones timed a hair after the end of the decoded audio. A marker placed
     * after the last word (a trailing `[[cutaway:off]]`) gets the time the voice alignment ends at, which can be a few hundredths
     * of a second more than the duration of the decoded file, so `advance` never reaches it.
     */
    finish() {
        const last = this.last;
        const cues = dueCues(this.cues, last, Number.POSITIVE_INFINITY);
        this.last = Math.max(last, ...cues.map((c) => c.t));
        return { replay: false, cues };
    }
    get position() {
        return this.last;
    }
}
// ---------------------------------------------------------------- small helpers
/** `m:ss` (a minute and a half is `1:30`). */
export function formatTime(seconds) {
    const s = Math.max(0, Math.round(seconds));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
// ---------------------------------------------------------------- captions that fit
/**
 * Break the captions so none is longer than `maxChars` (the room of two lines of subtitles). A caption is cut where the speech
 * pauses (after a comma, a colon, a dash, an ellipsis) near the middle, else at a space; its time is shared between the pieces
 * in proportion to their length. A caption that fits is left as it is; the pieces together cover exactly the same time and text.
 */
export function splitCaptions(captions, maxChars) {
    const out = [];
    const cut = (c) => {
        const text = c.text.trim();
        if (text.length <= maxChars || text.length < 8) {
            out.push({ t0: c.t0, t1: c.t1, text });
            return;
        }
        // the cut: a pause or a space, as near the middle as possible (within the middle half when a pause is there)
        const mid = text.length / 2;
        let best = -1;
        let bestScore = Infinity;
        for (let i = 2; i < text.length - 2; i++) {
            const space = text[i] === ' ';
            const pause = space && /[,;:…—–.!?)»]$/.test(text.slice(0, i));
            if (!space)
                continue;
            const score = Math.abs(i - mid) - (pause && Math.abs(i - mid) < text.length / 4 ? text.length / 4 : 0);
            if (score < bestScore) {
                bestScore = score;
                best = i;
            }
        }
        if (best < 0) {
            out.push({ t0: c.t0, t1: c.t1, text }); // one long word: nothing to cut
            return;
        }
        const a = text.slice(0, best).trim();
        const b = text.slice(best).trim();
        const tm = c.t0 + ((c.t1 - c.t0) * a.length) / (a.length + b.length);
        cut({ t0: c.t0, t1: tm, text: a });
        cut({ t0: tm, t1: c.t1, text: b });
    };
    for (const c of captions)
        cut(c);
    return out;
}
