import type { Lesson } from '../../content/types';
import type { AppContext } from '../context';
/** Apply a lesson's focus: scene, preset/scenario, selected part. */
export declare function openLesson(ctx: AppContext, lesson: Lesson, runScenario: boolean): void;
export declare function renderLessonsPanel(ctx: AppContext, root: HTMLElement, onProgress: () => void): void;
export declare function renderPartsPanel(ctx: AppContext, root: HTMLElement): void;
/** The "Sources" panel: the kit adds the title, the lab supplies the content. */
export declare function renderAboutPanel(ctx: AppContext, root: HTMLElement): void;
