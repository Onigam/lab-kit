import { getLang, t } from '../i18n';
import { formatTime, type NarrationScope } from '../narration';
import type { AppContext } from './context';
import { fill, h, icon, ICONS } from './dom';
import { NARRATION_SPEEDS, type NarrationEngine } from './narration';

// What the visitor sees of the spoken guide: the speaker button of the header, the « Écouter » buttons of the overviews and
// part sheets, and the dock over the 3D view (subtitles, then the transport bar with the mention of the synthetic voice).

/** Seconds a keyboard arrow moves in the audio. */
const KEY_SEEK = 5;
/** Average width of a character of the subtitles, in em (Space Grotesk), to know how many fit in two lines. */
const CHAR_EM = 0.54;
const SUB_FONT = 15;
/** Padding on each side of a subtitle, in px. */
const SUB_PAD = 12;

const fmtSpeed = (v: number) => `${String(v).replace('.', getLang() === 'fr' ? ',' : '.')}×`;

/** Two lines of subtitles in characters, for a dock `width` px wide (mirrors `.narr__caption` in styles.css). */
function captionRoom(width: number): number {
  const box = Math.max(0.7 * width, Math.min(width, 340)) - 2 * SUB_PAD;
  return Math.floor(box / (SUB_FONT * CHAR_EM)) * 2 * 0.92;
}

export class NarrationPlayer {
  /** The dock over the 3D view (put it in the viewport). */
  readonly el: HTMLElement;
  /** The speaker button of the header (put it next to the language switch when `speakerShown`). */
  readonly speaker: HTMLButtonElement;
  /** The first-visit bubble that invites to the introduction (put it right after the speaker, in the same anchor). */
  readonly invite: HTMLElement;
  private readonly inviteText: HTMLElement;

  private playBtn: HTMLButtonElement;
  private titleEl = h('b', { class: 'narr__title' });
  private voiceEl = h('small', { class: 'narr__voice' });
  private speedBtn: HTMLButtonElement;
  private subsBtn: HTMLButtonElement;
  private guideBtn: HTMLButtonElement;
  private closeBtn: HTMLButtonElement;
  private subs = h('div', { class: 'narr__subs', 'aria-live': 'polite', 'aria-atomic': 'true' });
  private caption = h('p', { class: 'narr__caption' });
  private notice = h('div', { class: 'narr__notice', role: 'status' });
  // plain spans (an <output> is a live region): the slider says its position to a screen reader through aria-valuetext
  private elapsed = h('span', { class: 'narr__t', 'aria-hidden': 'true' }, '0:00');
  private total = h('span', { class: 'narr__t', 'aria-hidden': 'true' }, '0:00');
  private range: HTMLInputElement;
  private scrubbing = false;
  private noticeKey = '';
  private off: (() => void)[] = [];

  constructor(private engine: NarrationEngine) {
    this.playBtn = h('button', { class: 'icon-btn narr__play', type: 'button', onclick: () => engine.toggle() });
    this.speedBtn = h('button', {
      class: 'tool narr__speed',
      type: 'button',
      onclick: () => {
        const i = NARRATION_SPEEDS.indexOf(engine.state.speed);
        engine.setSpeed(NARRATION_SPEEDS[(i + 1) % NARRATION_SPEEDS.length]);
      },
    });
    this.subsBtn = h(
      'button',
      { class: 'tool', type: 'button', onclick: () => engine.setSubtitles(!engine.state.subtitles) },
      icon(ICONS.subtitles, 16),
    );
    this.guideBtn = h(
      'button',
      { class: 'tool', type: 'button', onclick: () => engine.setGuidance(!engine.state.guidance) },
      icon(ICONS.focus, 16),
      h('span', { class: 'narr__label' }),
    );
    this.closeBtn = h(
      'button',
      { class: 'icon-btn narr__close', type: 'button', onclick: () => engine.close() },
      icon(ICONS.close, 16),
    );
    this.range = h('input', { class: 'narr__range', type: 'range', min: 0, max: 1, step: 0.1, value: 0 });
    this.range.addEventListener('input', () => {
      this.scrubbing = true;
      this.elapsed.textContent = formatTime(Number(this.range.value));
    });
    this.range.addEventListener('change', () => {
      this.scrubbing = false;
      engine.seek(Number(this.range.value));
    });
    this.range.addEventListener('keydown', (e) => {
      const step = { ArrowLeft: -KEY_SEEK, ArrowRight: KEY_SEEK, PageDown: -3 * KEY_SEEK, PageUp: 3 * KEY_SEEK }[e.key];
      if (step !== undefined) {
        e.preventDefault();
        engine.seek(engine.state.position + step);
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        engine.seek(e.key === 'Home' ? 0 : engine.state.duration);
      }
    });

    this.subs.append(this.caption);
    this.el = h(
      'section',
      { class: 'narr', role: 'region', tabindex: -1, hidden: true },
      this.notice,
      this.subs,
      h(
        'div',
        { class: 'narr__bar' },
        this.playBtn,
        h('div', { class: 'narr__meta' }, this.titleEl, this.voiceEl),
        h('div', { class: 'narr__time' }, this.elapsed, this.range, this.total),
        h('div', { class: 'narr__tools' }, this.speedBtn, this.subsBtn, this.guideBtn, this.closeBtn),
      ),
    );
    // space plays and pauses when the focus is in the dock (a button keeps its own space)
    this.el.addEventListener('keydown', (e) => {
      if (e.key !== ' ' || (e.target as HTMLElement).closest('button')) return;
      e.preventDefault();
      engine.toggle();
    });
    // the room for the subtitles follows the width of the view
    const ro = new ResizeObserver(() => engine.setCaptionRoom(captionRoom(this.el.clientWidth)));
    ro.observe(this.el);
    this.off.push(() => ro.disconnect());

    this.speaker = h('button', { class: 'icon-btn narr-speaker', type: 'button', onclick: () => this.speakerClick() });
    this.speaker.append(icon(ICONS.speaker, 18), h('i', { class: 'narr-speaker__dot', 'aria-hidden': 'true' }));

    // the first visit: a quiet bubble under the speaker; its text starts the introduction, the cross only dismisses it
    this.inviteText = h('span', {});
    const closeInvite = h('button', {
      class: 'narr-invite__x',
      type: 'button',
      onclick: () => engine.markInvited(),
    });
    closeInvite.append(icon(ICONS.close, 14));
    this.invite = h(
      'div',
      { class: 'narr-invite', role: 'status', hidden: true },
      h('button', { class: 'narr-invite__go', type: 'button', onclick: () => this.speakerClick() }, this.inviteText),
      closeInvite,
    );
    closeInvite.setAttribute('aria-label', t('close'));
    closeInvite.title = t('close');

    const onResize = (): void => this.keepInviteInView();
    window.addEventListener('resize', onResize);
    this.off.push(() => window.removeEventListener('resize', onResize));

    this.off.push(
      engine.onChange((event) => {
        if (event === 'time') this.renderTime();
        else this.render();
      }),
    );
    this.render();
  }

  /** On a narrow screen the bubble would leave the view on the left: push it back to the right, the arrow follows. */
  private keepInviteInView(): void {
    if (this.invite.hidden) return;
    this.invite.style.setProperty('--narr-shift', '0px');
    const shift = Math.max(0, 12 - this.invite.getBoundingClientRect().left);
    if (shift > 0) this.invite.style.setProperty('--narr-shift', `${Math.ceil(shift)}px`);
  }

  private speakerClick(): void {
    const e = this.engine;
    if (e.state.scope === 'intro' && e.state.segment) e.toggle();
    else e.play('intro');
  }

  /** The speaker button belongs in the header: the manifest of this language has an introduction. */
  get speakerShown(): boolean {
    return this.engine.has('intro');
  }

  /** Height of the dock and the room kept above it, when it is shown (0 when it is not): what the 3D view loses. */
  cover(): number {
    return this.el.hidden ? 0 : this.el.offsetHeight + 8;
  }

  get active(): boolean {
    return !this.el.hidden;
  }

  destroy(): void {
    for (const off of this.off.splice(0)) off();
  }

  // ------------------------------------------------------------ drawing

  private render(): void {
    const e = this.engine;
    const s = e.state;
    const seg = s.segment;
    const running = s.status === 'playing' || s.status === 'loading';

    // the header button: pressed while the introduction is the segment on air, with a dot while it speaks
    const intro = s.scope === 'intro' && !!seg;
    this.speaker.hidden = !this.speakerShown;
    this.speaker.setAttribute('aria-label', t('narrIntro'));
    this.speaker.title = t('narrIntro');
    this.speaker.setAttribute('aria-pressed', intro && running ? 'true' : 'false');
    this.speaker.classList.toggle('is-playing', !!seg && running);
    this.speaker.classList.toggle('is-on', intro);

    // first visit only: the bubble and the soft pulse that invite to the introduction, until the visitor has used or
    // dismissed them (never while something is on air)
    const inviting = this.speakerShown && !seg && !e.invited;
    this.invite.hidden = !inviting;
    this.speaker.classList.toggle('is-inviting', inviting);
    if (inviting) {
      const duration = e.segment('intro')?.duration ?? 0;
      const text = duration > 0 ? `${t('narrInvite')} · ${formatTime(duration)}` : t('narrInvite');
      if (this.inviteText.dataset.text !== text) {
        this.inviteText.dataset.text = text;
        // the duration never breaks onto a line of its own
        this.inviteText.replaceChildren(
          duration > 0 ? h('span', {}, `${t('narrInvite')} · `) : text,
          ...(duration > 0 ? [h('b', { class: 'narr-invite__t' }, formatTime(duration))] : []),
        );
      }
      requestAnimationFrame(() => this.keepInviteInView());
    }

    this.el.hidden = !seg;
    if (!seg) {
      this.notice.replaceChildren();
      this.noticeKey = '';
      return;
    }
    this.el.setAttribute('aria-label', t('narrPlayer'));
    this.titleEl.textContent = seg.title;
    this.titleEl.title = seg.title;
    this.voiceEl.textContent = e.voiceLabel;

    const replay = s.status === 'ended' || s.status === 'error';
    const label = replay ? t('narrReplay') : running ? t('pause') : t('play');
    fill(this.playBtn, icon(replay ? ICONS.reset : running ? ICONS.pause : ICONS.play, 16));
    this.playBtn.setAttribute('aria-label', label);
    this.playBtn.title = label;

    this.speedBtn.textContent = fmtSpeed(s.speed);
    this.speedBtn.setAttribute('aria-label', `${t('narrSpeed')} : ${fmtSpeed(s.speed)}`);
    this.speedBtn.title = t('narrSpeed');
    this.toggle(this.subsBtn, t('narrSubtitles'), s.subtitles);
    this.toggle(this.guideBtn, t('narrGuidance'), s.guidance);
    this.closeBtn.setAttribute('aria-label', t('close'));
    this.closeBtn.title = t('close');
    this.range.setAttribute('aria-label', t('narrSeek'));

    // the subtitle (the box is always there while they are on, so the dock does not change height)
    this.subs.hidden = !s.subtitles;
    if (this.caption.textContent !== s.caption) this.caption.textContent = s.caption;

    this.renderNotice();
    this.renderTime();
  }

  private toggle(btn: HTMLButtonElement, label: string, on: boolean): void {
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', label);
    btn.title = label;
    const text = btn.querySelector('.narr__label');
    if (text && text.textContent !== label) text.textContent = label;
  }

  /** The line floating over the dock: a problem, the way to hear it again, or the way to take the guidance back. */
  private renderNotice(): void {
    const s = this.engine.state;
    let key = '';
    let content: (Node | string)[] = [];
    if (s.error) {
      key = `error:${s.error}`;
      content = [t(s.error === 'blocked' ? 'narrBlocked' : 'narrUnavailable')];
    } else if (s.status === 'ended') {
      key = 'ended';
      content = [this.noticeButton(ICONS.reset, t('narrReplay'), () => this.engine.toggle())];
    } else if (s.suspended && s.guidance) {
      key = 'resume';
      content = [this.noticeButton(ICONS.focus, t('narrResume'), () => this.engine.resumeGuidance())];
    }
    key += `:${getLang()}`;
    if (key === this.noticeKey) return;
    this.noticeKey = key;
    fill(this.notice, ...content);
  }

  private noticeButton(path: string, label: string, onclick: () => void): HTMLButtonElement {
    return h('button', { class: 'btn btn--small btn--primary', type: 'button', onclick }, icon(path, 14), label);
  }

  private renderTime(): void {
    const s = this.engine.state;
    const max = Math.max(s.duration, 0.1);
    if (Number(this.range.max) !== max) this.range.max = String(max);
    if (!this.scrubbing) {
      this.range.value = String(s.position);
      this.elapsed.textContent = formatTime(s.position);
    }
    this.total.textContent = formatTime(s.duration);
    this.range.setAttribute(
      'aria-valuetext',
      `${formatTime(Number(this.range.value))} ${t('narrOf')} ${formatTime(s.duration)}`,
    );
  }
}

// ---------------------------------------------------------------- « Écouter » buttons

/**
 * The « Écouter · 0:42 » button of a world overview, a part sheet or a lesson, in a small row of its own; `null` when the
 * lab has no narration, the language has no manifest, or the manifest has no segment for it. It follows the player: pause
 * while it speaks, « Réécouter » at the end.
 */
export function listenRow(ctx: AppContext, scope: NarrationScope): HTMLElement | null {
  const engine = ctx.narration;
  const seg = engine?.has(scope) ? engine.segment(scope) : undefined;
  if (!engine || !seg) return null;
  const label = h('span', {});
  const btn = h(
    'button',
    {
      class: 'btn btn--listen',
      type: 'button',
      onclick: () => (engine.state.scope === scope ? engine.toggle() : engine.play(scope)),
    },
    icon(ICONS.speaker, 16),
    label,
  );
  const update = (): void => {
    const s = engine.state;
    const mine = s.scope === scope && !!s.segment;
    const running = mine && (s.status === 'playing' || s.status === 'loading');
    const text = running
      ? t('pause')
      : mine && s.status === 'ended'
        ? t('narrReplay')
        : `${t('narrListen')} · ${formatTime(seg.duration)}`;
    if (label.textContent !== text) label.textContent = text;
    btn.classList.toggle('is-on', running);
    // until the visitor has used the guide once, the button of the overview stands out
    btn.classList.toggle('is-invite', !running && !engine.invited);
    btn.setAttribute('aria-pressed', running ? 'true' : 'false');
  };
  update();
  // the button follows the player for as long as it is on the page (a sheet that is drawn again drops its old buttons)
  const off = engine.onChange((event) => {
    if (!btn.isConnected) {
      if (event !== 'time' && !btn.dataset.fresh) off();
      return;
    }
    if (event !== 'time') update();
  });
  btn.dataset.fresh = '1';
  // the button is not in the page until the caller puts it there: give it a frame before judging it gone
  requestAnimationFrame(() => delete btn.dataset.fresh);
  return h('div', { class: 'listen' }, btn);
}
