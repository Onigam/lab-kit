import type { L } from '../i18n';
import type { SceneId } from '../three/types';

export type PartCategory = 'hydraulic' | 'mechanical' | 'electrical' | 'structure' | 'site';

export interface Spec {
  label: L;
  value: L | string;
}

/** Catalogue entry for one 3D part (turbine, site or technical room). */
export interface PartInfo {
  id: string;
  scene: SceneId;
  category: PartCategory;
  name: L;
  /** One line: what it does. */
  short: L;
  /** 2–5 sentences: how it works and why it is designed that way. */
  description: L;
  material: L;
  specs: Spec[];
  /** Maintenance advice, if any. */
  maintenance?: L;
  /** Practical tip / common mistake. */
  tip?: L;
  /** Timestamp(s) in the source video where the part is shown or discussed, e.g. "07:38". */
  video?: string[];
  /** Quantity in the assembly (default 1). */
  qty?: number;
  /** Short design note (1–3 sentences): why the part is designed this way. Shown in the "Design" tab. */
  design?: L;
}

/** One step of an assembly or installation guide. `text` may use **bold** around part names. */
export interface GuideStep {
  id: string;
  title: L;
  text: L;
  /** Part ids that get installed during this step (animated into place). */
  parts: string[];
  tools?: L[];
  tip?: L;
  warning?: L;
  /** e.g. "2 N·m" */
  torque?: string;
  /** e.g. "10 min" */
  duration?: string;
}

export interface QuizItem {
  q: L;
  choices: L[];
  answer: number;
  explain: L;
}

export interface Lesson {
  id: string;
  /** Short title shown on the lesson card. */
  title: L;
  /** One-line teaser for the card. */
  summary: L;
  /** Body paragraphs. May use **bold**. Keep each paragraph 2–4 sentences. */
  body: L[];
  /** Key figures shown as chips, e.g. { label: "Head", value: "76 m" }. */
  figures?: Spec[];
  /** Formula shown in a monospace box, e.g. "P = ρ · g · Q · H · η". */
  formula?: string;
  /** What the 3D view focuses on when the lesson opens. */
  focus: { scene: SceneId; part?: string; preset?: string; scenario?: string };
  /** Timestamp in the source video. */
  video?: string;
  quiz?: QuizItem[];
}
