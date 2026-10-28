import { type NarrationScope } from '../narration';
import type { AppContext } from './context';
import { type NarrationEngine } from './narration';
export declare class NarrationPlayer {
    private engine;
    /** The dock over the 3D view (put it in the viewport). */
    readonly el: HTMLElement;
    /** The speaker button of the header (put it next to the language switch when `speakerShown`). */
    readonly speaker: HTMLButtonElement;
    private playBtn;
    private titleEl;
    private voiceEl;
    private speedBtn;
    private subsBtn;
    private guideBtn;
    private closeBtn;
    private subs;
    private caption;
    private notice;
    private elapsed;
    private total;
    private range;
    private scrubbing;
    private noticeKey;
    private off;
    constructor(engine: NarrationEngine);
    private speakerClick;
    /** The speaker button belongs in the header: the manifest of this language has an introduction. */
    get speakerShown(): boolean;
    /** Height of the dock and the room kept above it, when it is shown (0 when it is not): what the 3D view loses. */
    cover(): number;
    get active(): boolean;
    destroy(): void;
    private render;
    private toggle;
    /** The line floating over the dock: a problem, the way to hear it again, or the way to take the guidance back. */
    private renderNotice;
    private noticeButton;
    private renderTime;
}
/**
 * The « Écouter · 0:42 » button of a world overview, a part sheet or a lesson, in a small row of its own; `null` when the
 * lab has no narration, the language has no manifest, or the manifest has no segment for it. It follows the player: pause
 * while it speaks, « Réécouter » at the end.
 */
export declare function listenRow(ctx: AppContext, scope: NarrationScope): HTMLElement | null;
