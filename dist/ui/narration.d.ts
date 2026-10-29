import { type NarrationScope, type NarrationSegment } from '../narration';
import { type AppContext } from './context';
import type { Narration } from './lab';
/** Playback speeds offered by the transport bar. */
export declare const NARRATION_SPEEDS: number[];
export type NarrationStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';
export interface NarrationState {
    status: NarrationStatus;
    scope: NarrationScope | null;
    segment: NarrationSegment | null;
    /** Seconds. */
    position: number;
    duration: number;
    speed: number;
    /** Subtitles on or off (remembered in this browser). */
    subtitles: boolean;
    /** The "3D guidance" switch (remembered in this browser): off, the audio plays and the 3D view is left alone. */
    guidance: boolean;
    /** The visitor took the camera, the world or the mode: the cues are not applied until the guidance is resumed. */
    suspended: boolean;
    /** The subtitle to show now (empty: none). */
    caption: string;
    error: 'blocked' | 'unavailable' | null;
}
/** `ready`: the manifest of the language was loaded (or is gone); `state`: anything but the clock; `time`: the clock only. */
export type NarrationEvent = 'ready' | 'state' | 'time';
export declare class NarrationEngine {
    private ctx;
    private config;
    private lang;
    private manifest;
    private manifestUrl;
    /** Manifests already asked for, by URL (`null`: not there). */
    private cache;
    private loading;
    private audioEl;
    private audioUrl;
    private clock;
    private chunks;
    private maxChars;
    private raf;
    /** > 0 while the engine itself changes the interface, so the store listener does not take it for the visitor. */
    private applying;
    /** Bumped when the segment changes or stops: a camera move planned before is no longer wanted. */
    private generation;
    private startMode;
    private warned;
    private listeners;
    private teardown;
    private offLang;
    private started;
    private destroyed;
    readonly state: NarrationState;
    constructor(ctx: AppContext, config: Narration);
    /** Begin loading the manifest of the current language; follows the language from then on. */
    start(): void;
    /** The narration is offered: the manifest of the current language is loaded and has segments. */
    get ready(): boolean;
    /** The mention of the synthetic voice, in the interface language. */
    get voiceLabel(): string;
    segment(scope: NarrationScope): NarrationSegment | undefined;
    /** The segment can be played here: it exists in the manifest and what it is about exists in the lab. */
    has(scope: NarrationScope): boolean;
    private urlFor;
    private refresh;
    onChange(fn: (event: NarrationEvent) => void): () => void;
    private emit;
    private get prefsKey();
    /** The key that remembers, per lab, that the visitor has been invited to the introduction (or used the guide). */
    private get invitedKey();
    private invitedInMemory;
    /**
     * The visitor has already been invited to the spoken guide, or has used it: the invitation of the header never comes
     * back. Kept in the browser; without storage it lasts for the visit.
     */
    get invited(): boolean;
    /** Remember that the invitation has been seen (dismissed, accepted, or the guide played). */
    markInvited(): void;
    private loadPrefs;
    private savePrefs;
    setSubtitles(on: boolean): void;
    setSpeed(speed: number): void;
    /** The "3D guidance" switch. Switching it on applies the state of the current position at once. */
    setGuidance(on: boolean): void;
    /** The visitor took control and wants the narrator back: apply the state of the current position and go on. */
    resumeGuidance(): void;
    /** Room for the subtitles, in characters (two lines): longer captions are cut into pieces that follow the voice. */
    setCaptionRoom(maxChars: number): void;
    private audio;
    /** Play a segment from its start (the one playing, if any, stops). Call it from a click: the browser lets it start. */
    play(scope: NarrationScope): void;
    private onPlayRejected;
    private fail;
    /** Play or pause; after the end, play again from the start. */
    toggle(): void;
    /** Move to `seconds`; the state of the 3D view at that point is rebuilt (guidance on). */
    seek(seconds: number): void;
    private onEnded;
    /** Stop and hide the transport bar. The 3D view stays as it is. */
    close(): void;
    private closeQuietly;
    /** Release everything: the audio, the listeners, the frame loop. */
    destroy(): void;
    private syncDuration;
    private loop;
    /** Read the audio clock: the position, the subtitle and the cues passed since the last reading. */
    private tick;
    private updateCaption;
    /** The cues are applied: the switch is on and the visitor has not taken over. */
    get guided(): boolean;
    /** Rebuild the 3D state at `t` (default: the current position). */
    private replay;
    /**
     * The state at the start of the segment, then the last cue of each kind up to now. What the segment's cues touch goes back
     * to its starting value first, so a seek backwards undoes what a later cue did.
     */
    private applyState;
    /** Apply actions in order, then move the camera once, to where the last of them wants it. */
    private run;
    private flight;
    private warnOnce;
    private setEmphasis;
    /**
     * Camera padding for the parts the narrator points at: closer than when a part is clicked (the narrator wants the view to
     * zoom and focus), never further than the world's own `partPadding`.
     */
    private framePadding;
    private apply;
    private attach;
    private detach;
    /**
     * The visitor moved the camera (`camera`), or changed the world, the mode or the selected part by hand. A part's narration
     * is about that part's sheet: leaving it ends the narration. Any other keeps playing without the guidance, which the
     * visitor can ask back.
     */
    private visitorChanged;
}
