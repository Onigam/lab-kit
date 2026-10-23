import type { GuideStep, Lesson, PartInfo } from '../content';
import type { DrawingSheet } from '../drawings';
import type { L } from '../i18n';
import type { SceneModule, ViewOpts } from '../three';
import type { AppContext } from './context';

// What a lab provides to the kit: its simulation, 3D worlds, content and a few hooks. The kit
// supplies everything else (layout, toolbar, panels, plans viewer) so every lab looks and
// behaves the same.

/** The few simulation members the shell relies on; everything else stays inside the lab. */
export interface LabSim {
  /** Opaque simulation state, handed to the 3D scenes every frame. */
  readonly state: unknown;
  readonly params: { slowMo: number; timeScale: number; running: boolean };
  step(dt: number): void;
  set(patch: { slowMo?: number; timeScale?: number; running?: boolean }): void;
  onChange(fn: () => void): void;
  /** Used by lessons that open on a preset or a scenario. */
  applyPreset?(id: string): void;
  applyScenario?(id: string): void;
}

/** One 3D world of the lab (landscape, device, power room…). */
export interface SceneDef {
  id: string;
  /** Name in the scene switch of the top bar. */
  label: L;
  module: SceneModule;
  /** Text and shortcuts of the side panel while nothing is selected in this world. */
  overview?: { title: L; text: L; actions?: { label: L; scene: string; primary?: boolean }[] };
  /** Show the section tool in this world (default: yes). */
  cutaway?: boolean;
  /** Show the slow-motion tool in this world (default: yes). */
  slowMo?: boolean;
  /** X-ray only makes sense around a selected part (landscapes). */
  xrayNeedsSelection?: boolean;
  /** Camera padding when a part is framed (default 2.4; larger = further away). */
  partPadding?: number;
  /** Camera framing of a guide step: padding and smallest radius (metres) around its parts. */
  stepFrame?: { padding: number; minRadius: number };
  /** Parts made transparent by X-ray while nothing is selected. */
  xrayShell?: (partId: string) => boolean;
}

export interface GuideDef {
  /** World the guide plays in. */
  scene: string;
  steps: GuideStep[];
}

/** One live value of the bottom strip (already translated). */
export interface StripValue {
  label: string;
  value: string;
  unit: string;
  /** Colour class, e.g. 'live--water'. */
  cls?: string;
}

export interface StripAlarm {
  key: string;
  label: string;
  severe?: boolean;
}

export interface LabStrip<S extends LabSim = LabSim> {
  values(sim: S): StripValue[];
  /** Clock shown at the left of the strip: main text and a smaller line under it. */
  clock(sim: S): { time: string; sub: string };
  alarms(sim: S): StripAlarm[];
  /** Selectable simulation speeds (default 1, 60, 600, 3600). */
  speeds?: number[];
}

/** A side panel owned by the lab (the simulation panel). */
export interface PanelController {
  el: HTMLElement;
  render(): void;
  tick(dt: number): void;
}

export interface FrameInfo<S extends LabSim = LabSim> {
  sim: S;
  dt: number;
  view: ViewOpts;
  activeScene: string;
}

export interface LabDefinition<S extends LabSim = LabSim> {
  /** Short id, also the prefix of the keys the lab stores in the browser. */
  id: string;
  brand: { title: string; tagline: L; icon: string };
  sim: S;
  scenes: SceneDef[];
  defaultScene: string;
  parts: PartInfo[];
  guides?: { assembly?: GuideDef; install?: GuideDef };
  lessons?: { items: Lesson[]; intro: L };
  plans?: {
    sheets: DrawingSheet[];
    groups: { id: string; label: L }[];
    intro: L;
    footer?: () => HTMLElement | null;
  };
  /** Builds the simulation side panel; the "Simulation" mode is hidden without it. */
  simPanel?: (ctx: AppContext<S>) => PanelController;
  strip: LabStrip<S>;
  /** Content of the "Sources" panel (the kit adds its title). */
  about: (ctx: AppContext<S>) => HTMLElement[];
  /** YouTube video the part sheets link into with timestamps. */
  video?: { id: string };
  /** Extra buttons on a part sheet (for example a "test" button). */
  partActions?: (ctx: AppContext<S>, info: PartInfo) => HTMLElement[];
  /** Parts that open a detailed world: partId -> world and button label. */
  partLinks?: Record<string, { scene: string; label: L }>;
  /** Per-frame hook (for example to update a second instance of a model). */
  onFrame?(frame: FrameInfo<S>): void;
  /** Called when the section tool changes or the world changes. */
  onCutaway?(on: boolean, sceneId: string): void;
}

/** A lab definition whatever its simulation type (what the shell accepts). */
export type AnyLab = LabDefinition<any>;
