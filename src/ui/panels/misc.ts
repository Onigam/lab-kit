import type { Lesson, PartCategory } from '../../content/types';
import { t, tr, type CommonKey } from '../../i18n';
import type { AppContext } from '../context';
import { fill, h, icon, ICONS, rich } from '../dom';

// Lessons, parts catalogue and the sources panel shell.

// ---------------------------------------------------------------- lessons

/** Apply a lesson's focus: scene, preset/scenario, selected part. */
export function openLesson(ctx: AppContext, lesson: Lesson, runScenario: boolean): void {
  const f = lesson.focus;
  if (f.preset) ctx.sim.applyPreset?.(f.preset);
  if (runScenario && f.scenario) ctx.sim.applyScenario?.(f.scenario);
  ctx.store.set({ scene: f.scene, lesson: lesson.id, mode: 'lessons', explode: 0, isolate: false });
  if (f.part) ctx.selectPart(f.part, { mode: 'lessons' });
  else ctx.store.set({ selected: null });
}

export function renderLessonsPanel(ctx: AppContext, root: HTMLElement, onProgress: () => void): void {
  const lessons = ctx.def.lessons;
  if (!lessons) return;
  const LESSONS = lessons.items;
  const done = ctx.lessonsDone();
  const lesson = LESSONS.find((x) => x.id === ctx.ui.lesson);
  if (!lesson) {
    fill(
      root,
      h('div', { class: 'eyebrow eyebrow--accent' }, t('lessonsTitle')),
      h('p', { class: 'lead' }, tr(lessons.intro)),
      h(
        'ol',
        { class: 'lesson-list' },
        ...LESSONS.map((ls, i) =>
          h(
            'li',
            {},
            h(
              'button',
              { class: `lesson-card ${done.has(ls.id) ? 'is-done' : ''}`, onclick: () => openLesson(ctx, ls, false) },
              h('span', { class: 'lesson-card__num' }, String(i + 1).padStart(2, '0')),
              h('span', { class: 'lesson-card__body' }, h('b', {}, tr(ls.title)), h('small', {}, tr(ls.summary))),
              done.has(ls.id) ? icon(ICONS.ok, 18) : icon(ICONS.next, 18),
            ),
          ),
        ),
      ),
    );
    return;
  }

  const idx = LESSONS.indexOf(lesson);
  const quiz = h('div', { class: 'quiz' });
  let correct = 0;
  (lesson.quiz ?? []).forEach((item, qi) => {
    const feedback = h('p', { class: 'quiz__feedback' });
    const choices = h(
      'div',
      { class: 'quiz__choices' },
      ...item.choices.map((c, ci) =>
        h(
          'button',
          {
            class: 'quiz__choice',
            onclick: (ev: Event) => {
              const btn = ev.currentTarget as HTMLButtonElement;
              const ok = ci === item.answer;
              choices.querySelectorAll('button').forEach((b) => b.classList.remove('is-right', 'is-wrong'));
              btn.classList.add(ok ? 'is-right' : 'is-wrong');
              fill(feedback, h('b', {}, ok ? t('correct') : t('wrong')), ' ', rich(tr(item.explain)));
              if (ok && !btn.dataset.counted) {
                btn.dataset.counted = '1';
                correct++;
                if (correct >= (lesson.quiz?.length ?? 0)) {
                  ctx.markLessonDone(lesson.id);
                  onProgress();
                }
              }
            },
          },
          tr(c),
        ),
      ),
    );
    quiz.append(
      h(
        'div',
        { class: 'quiz__item' },
        h('p', { class: 'quiz__q' }, `${qi + 1}. `, rich(tr(item.q))),
        choices,
        feedback,
      ),
    );
  });

  fill(
    root,
    h(
      'div',
      { class: 'panel-head' },
      h(
        'button',
        { class: 'btn btn--ghost btn--small', onclick: () => ctx.store.set({ lesson: null }) },
        icon(ICONS.prev, 16),
        t('back'),
      ),
      h('span', { class: 'eyebrow' }, `${idx + 1} / ${LESSONS.length}`),
    ),
    h('h2', { class: 'panel-title' }, tr(lesson.title)),
    h('p', { class: 'lead' }, rich(tr(lesson.summary))),
    lesson.figures?.length
      ? h(
          'div',
          { class: 'figures' },
          ...lesson.figures.map((f) =>
            h('div', { class: 'figure' }, h('b', {}, tr(f.value)), h('span', {}, tr(f.label))),
          ),
        )
      : null,
    lesson.formula ? h('pre', { class: 'formula' }, lesson.formula) : null,
    ...lesson.body.map((p) => h('p', {}, rich(tr(p)))),
    h(
      'div',
      { class: 'actions' },
      lesson.focus.scenario
        ? h(
            'button',
            { class: 'btn btn--primary', onclick: () => openLesson(ctx, lesson, true) },
            icon(ICONS.play, 16),
            t('runScenario'),
          )
        : null,
      lesson.focus.part
        ? h(
            'button',
            { class: 'btn', onclick: () => ctx.selectPart(lesson.focus.part!, { mode: 'lessons' }) },
            icon(ICONS.focus, 16),
            t('showIn3d'),
          )
        : null,
      lesson.video
        ? h(
            'a',
            { class: 'btn btn--ghost', href: ctx.videoUrl(lesson.video), target: '_blank', rel: 'noopener noreferrer' },
            icon(ICONS.video, 16),
            `${t('inVideo')} ${lesson.video}`,
          )
        : null,
    ),
    lesson.quiz?.length ? h('h3', { class: 'section-title' }, t('quiz')) : null,
    quiz,
    h(
      'div',
      { class: 'actions' },
      idx > 0
        ? h(
            'button',
            { class: 'btn btn--ghost', onclick: () => openLesson(ctx, LESSONS[idx - 1], false) },
            icon(ICONS.prev, 16),
            t('prev'),
          )
        : null,
      idx < LESSONS.length - 1
        ? h(
            'button',
            {
              class: 'btn',
              onclick: () => (ctx.markLessonDone(lesson.id), onProgress(), openLesson(ctx, LESSONS[idx + 1], false)),
            },
            t('next'),
            icon(ICONS.next, 16),
          )
        : null,
    ),
  );
}

// ---------------------------------------------------------------- parts catalogue

let query = '';
let sceneFilter = 'all';
let catFilter: PartCategory | 'all' = 'all';

const CATS: [PartCategory, CommonKey][] = [
  ['hydraulic', 'catHydraulic'],
  ['mechanical', 'catMechanical'],
  ['electrical', 'catElectrical'],
  ['structure', 'catStructure'],
  ['site', 'catSite'],
];

export function renderPartsPanel(ctx: AppContext, root: HTMLElement): void {
  const list = h('div', { class: 'catalogue' });
  const fillList = () => {
    const q = query.trim().toLowerCase();
    const items = ctx.def.parts.filter(
      (p) =>
        (sceneFilter === 'all' || p.scene === sceneFilter) &&
        (catFilter === 'all' || p.category === catFilter) &&
        (!q || `${p.id} ${p.name.fr} ${p.name.en} ${p.short.fr} ${p.short.en}`.toLowerCase().includes(q)),
    );
    fill(
      list,
      ...items.map((p) =>
        h(
          'button',
          { class: `cat-row cat-row--${p.category}`, onclick: () => ctx.selectPart(p.id, { mode: 'explore' }) },
          h('i', {}),
          h('span', {}, h('b', {}, tr(p.name)), h('small', {}, tr(p.short))),
        ),
      ),
    );
  };
  const filterChip = (label: string, active: boolean, on: () => void) =>
    h(
      'button',
      { class: `filter ${active ? 'is-active' : ''}`, onclick: () => (on(), renderPartsPanel(ctx, root)) },
      label,
    );
  fill(
    root,
    h('div', { class: 'eyebrow eyebrow--accent' }, t('partsTitle')),
    h('input', {
      class: 'search',
      type: 'search',
      placeholder: t('search'),
      value: query,
      oninput: (e: Event) => {
        query = (e.target as HTMLInputElement).value;
        fillList();
      },
    }),
    h(
      'div',
      { class: 'filters' },
      filterChip(t('all'), sceneFilter === 'all', () => (sceneFilter = 'all')),
      ...ctx.def.scenes.map((sc) => filterChip(tr(sc.label), sceneFilter === sc.id, () => (sceneFilter = sc.id))),
    ),
    h(
      'div',
      { class: 'filters' },
      filterChip(t('all'), catFilter === 'all', () => (catFilter = 'all')),
      ...CATS.map(([c, key]) => filterChip(t(key), catFilter === c, () => (catFilter = c))),
    ),
    list,
  );
  fillList();
}

// ---------------------------------------------------------------- sources

/** The "Sources" panel: the kit adds the title, the lab supplies the content. */
export function renderAboutPanel(ctx: AppContext, root: HTMLElement): void {
  fill(
    root,
    h('div', { class: 'eyebrow eyebrow--accent' }, t('modeAbout')),
    h('h2', { class: 'panel-title' }, t('aboutTitle')),
    ...ctx.def.about(ctx),
  );
}
