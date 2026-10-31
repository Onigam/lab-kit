// The decisions behind the look of the picture, without three.js or the DOM (so `tools/three/selftest.mjs` runs them in Node):
// what quality a device starts with, when a slow device lowers its pixel ratio, and which tone a world is drawn with.
/**
 * The warm look of a paper-studio world, as a world opts in to it: `scene.userData.look = { ...PAPER_STUDIO }`. The
 * Neutral curve keeps the labs' paper the paper (#efe6d3 is drawn #f1e8d4, ACES drew it grey, #dddad3) and the warm studio
 * lights the parts. Opt-in, world by world: materials tuned under ACES come out more saturated (an OSB wall, a plaster wall
 * turn orange), so a lab checks its palette before it turns it on.
 */
export const PAPER_STUDIO = { toneMapping: 'neutral', exposure: 1.2, environment: 'paper' };
/** The resolved look of a world: the picture of kit 0.4 (ACES at 1, three's room) unless the world asks otherwise. */
export function resolveWorldLook(userData) {
    const w = userData?.look ?? {};
    return {
        toneMapping: w.toneMapping ?? 'aces',
        exposure: w.exposure ?? 1,
        saturation: w.saturation ?? 1,
        environment: w.environment ?? 'room',
        ao: w.ao ?? !!userData?.wantsEnv,
        aoRadius: w.aoRadius,
    };
}
/**
 * The starting quality. Full (MSAA 4, pixel ratio up to 2) everywhere it is affordable; a device that reports 2 GB of memory
 * or less draws FXAA at pixel ratio 1.5 instead (the multisampled target of a phone at ratio 2 is about 58 MB more); a GPU
 * without 4 samples falls back to FXAA. An automated browser or `quality=full` always gets the full, fixed picture, so a
 * film is the same frame for frame on any machine that can draw it.
 */
export function planQuality(d) {
    const msaaOk = d.maxSamples >= 4;
    if (d.forceFull || d.automated)
        return { msaa: msaaOk ? 4 : 0, fxaa: !msaaOk, maxPixelRatio: 2, adaptive: false };
    const lowMemory = d.deviceMemory !== undefined && d.deviceMemory <= 2;
    if (lowMemory || !msaaOk)
        return { msaa: 0, fxaa: true, maxPixelRatio: lowMemory ? 1.5 : 2, adaptive: true };
    return { msaa: 4, fxaa: false, maxPixelRatio: 2, adaptive: true };
}
/**
 * Lowers the pixel ratio of a device whose frames are slow, one step at a time (2 → 1.75 → 1.5 → 1.25 → 1), never back up in
 * the same visit (no back and forth). It looks at the real time between frames: when the median of the last `window` frames
 * is over `slowMs` (under about 45 frames a second), it steps down and waits `cooldownMs` before judging again. Intervals over
 * 250 ms (a hidden tab, a world being built) are ignored.
 */
export class FrameGovernor {
    levels;
    level;
    samples = [];
    waitUntil = 0;
    window;
    slowMs;
    cooldownMs;
    constructor(startRatio, opts = {}) {
        this.levels = [2, 1.75, 1.5, 1.25, 1].filter((r) => r <= startRatio + 1e-6);
        if (!this.levels.length || this.levels[0] < startRatio - 1e-6)
            this.levels.unshift(startRatio);
        this.level = 0;
        this.window = opts.window ?? 90;
        this.slowMs = opts.slowMs ?? 22;
        this.cooldownMs = opts.cooldownMs ?? 3000;
    }
    /** The pixel ratio it holds now. */
    get ratio() {
        return this.levels[this.level];
    }
    /** One frame took `intervalMs` (real time) and ended at `nowMs`; returns the new pixel ratio when it steps down. */
    push(intervalMs, nowMs) {
        if (!(intervalMs > 0) || intervalMs > 250)
            return null;
        if (nowMs < this.waitUntil)
            return null;
        this.samples.push(intervalMs);
        if (this.samples.length < this.window)
            return null;
        if (this.samples.length > this.window)
            this.samples.shift();
        const sorted = [...this.samples].sort((a, b) => a - b);
        const median = sorted[sorted.length >> 1];
        if (median <= this.slowMs || this.level >= this.levels.length - 1)
            return null;
        this.level++;
        this.samples = [];
        this.waitUntil = nowMs + this.cooldownMs;
        return this.ratio;
    }
}
