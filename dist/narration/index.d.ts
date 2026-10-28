/** Which part of the lab a segment talks about. */
export type NarrationScope = 'intro' | `scene:${string}` | `part:${string}` | `lesson:${string}`;
/** What a cue does to the application; the object has exactly one of these keys (docs/narration.md §2). */
export type NarrationAction = {
    scene: string;
} | {
    home: true;
} | {
    frame: string[];
} | {
    select: string | null;
} | {
    explode: number;
} | {
    xray: boolean;
} | {
    cutaway: boolean;
} | {
    flows: boolean;
} | {
    isolate: boolean;
} | {
    mode: string;
} | {
    lab: string;
    arg?: string;
};
export interface NarrationCue {
    /** Seconds from the start of the audio. */
    t: number;
    do: NarrationAction;
}
export interface NarrationCaption {
    t0: number;
    t1: number;
    text: string;
}
export interface NarrationSegment {
    id: string;
    scope: NarrationScope;
    title: string;
    /** World the narration starts in. */
    scene?: string;
    /** Audio file, relative to the manifest. */
    file: string;
    /** Seconds. */
    duration: number;
    captions: NarrationCaption[];
    /** Sorted by time. */
    cues: NarrationCue[];
}
export interface NarrationManifest {
    lang: string;
    /** The mention of the synthetic voice, in both languages (always shown while a segment plays). */
    voiceLabel: {
        fr: string;
        en: string;
    };
    segments: NarrationSegment[];
}
export declare function isScope(value: unknown): value is NarrationScope;
/** `scene`, `part`, `lesson` or `intro`. */
export declare function scopeKind(scope: NarrationScope): 'intro' | 'scene' | 'part' | 'lesson';
/** The id after the colon (`part:nozzle` gives `nozzle`); empty for `intro`. */
export declare function scopeId(scope: NarrationScope): string;
export declare function findSegment(manifest: NarrationManifest | null | undefined, scope: NarrationScope): NarrationSegment | undefined;
/** One cue action of the manifest, checked; `null` when it is none of the known shapes. */
export declare function readAction(raw: unknown): NarrationAction | null;
/**
 * Read a manifest.json: keep what is usable and say what is not. A segment without a valid id, scope, file and duration is
 * dropped; a malformed caption or cue is dropped; cues are sorted by time (stable). `manifest` is `null` when there is no
 * usable segment.
 */
export declare function readManifest(raw: unknown): {
    manifest: NarrationManifest | null;
    problems: string[];
};
/** What a lab knows: the ids a manifest may name (see `validateManifest`). */
export interface NarrationVocabulary {
    scenes: string[];
    parts: string[];
    /** Lesson ids, if the lab has lessons. */
    lessons?: string[];
    /** Modes the lab offers (default: all of them). */
    modes?: string[];
}
export declare const NARRATION_MODES: readonly ['explore', 'assembly', 'install', 'sim', 'plans', 'lessons', 'parts', 'about'];
/**
 * The problems of a manifest against a lab, for the lab's own test: every scope, `scene`, cue id and mode must exist; a
 * `part:` segment must have its part and the audio duration must be sane. An empty list means all good.
 */
export declare function validateManifest(manifest: NarrationManifest, known: NarrationVocabulary): string[];
/**
 * The kind of a cue: a later cue of the same kind replaces an earlier one when a seek replays the state. Framings
 * (`frame`, `home`) share one kind: the camera can only be in one place.
 */
export declare function cueKind(a: NarrationAction): string;
/** The cues whose time is after `from` and not after `to`, in order (`cues` sorted by time). */
export declare function dueCues(cues: readonly NarrationCue[], from: number, to: number): NarrationCue[];
/**
 * The state at time `t`: the last cue of each kind at or before `t`, in the order they were given (so a scene change comes
 * before the selection that followed it).
 */
export declare function replayCues(cues: readonly NarrationCue[], t: number): NarrationCue[];
/** The caption to show at time `t` (none in a gap between two captions or after the last). */
export declare function captionAt(captions: readonly NarrationCaption[], t: number): NarrationCaption | null;
/** A position that moves backwards by more than this (seconds) is a seek. */
export declare const BACK_JUMP = 0.05;
/** A position that moves forward by more than this (seconds) in one reading is a seek, or a tab that slept. */
export declare const FORWARD_JUMP = 1.5;
export interface CueStep {
    /** `true`: the position jumped, `cues` is the state to rebuild (`replayCues`); `false`: `cues` are due now, in order. */
    replay: boolean;
    cues: NarrationCue[];
}
/**
 * Follows the audio clock: give it each reading of `currentTime` and it says which cues to run. Normal playback gives the
 * cues that were passed since the last reading; a jump (seek, a tab that was asleep) gives the state to rebuild instead of a
 * burst of every cue that was skipped.
 */
export declare class CueClock {
    private last;
    private cues;
    constructor(cues: readonly NarrationCue[]);
    /** Start (or seek) at `t`: the state at `t`. */
    seek(t: number): CueStep;
    /** The audio clock now reads `t`. */
    advance(t: number): CueStep;
    get position(): number;
}
/** `m:ss` (a minute and a half is `1:30`). */
export declare function formatTime(seconds: number): string;
/**
 * Break the captions so none is longer than `maxChars` (the room of two lines of subtitles). A caption is cut where the speech
 * pauses (after a comma, a colon, a dash, an ellipsis) near the middle, else at a space; its time is shared between the pieces
 * in proportion to their length. A caption that fits is left as it is; the pieces together cover exactly the same time and text.
 */
export declare function splitCaptions(captions: readonly NarrationCaption[], maxChars: number): NarrationCaption[];
