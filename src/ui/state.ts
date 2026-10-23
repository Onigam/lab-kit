// UI state shared by every panel. A tiny observable store; the 3D display logic and
// the panels read from it, controls write to it.

export type Mode = 'explore' | 'assembly' | 'install' | 'sim' | 'plans' | 'lessons' | 'parts' | 'about';

export interface UiState {
  scene: string;
  mode: Mode;
  selected: string | null;
  isolate: boolean;
  xray: boolean;
  explode: number;
  cutaway: boolean;
  schematic: boolean;
  labels: 'main' | 'all' | 'none';
  /** Current step index of the active guide (assembly or install). */
  step: number;
  playing: boolean;
  ghost: boolean;
  autoFrame: boolean;
  lesson: string | null;
  /** Mobile: bottom sheet expanded. */
  sheet: boolean;
  /** Desktop: side panel shown (hide it to give the whole width to the 3D view). */
  panelOpen: boolean;
  /** Drawing shown in the "Plans" mode. */
  drawing: string | null;
}

type Listener = (s: UiState, prev: UiState) => void;

export class Store {
  private listeners = new Set<Listener>();
  constructor(public state: UiState) {}

  set(patch: Partial<UiState>): void {
    const prev = this.state;
    this.state = { ...prev, ...patch };
    this.listeners.forEach((fn) => fn(this.state, prev));
  }

  on(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

/** A fresh store with the lab's starting world. */
export function createStore(scene: string): Store {
  return new Store({
    scene,
    mode: 'explore',
    selected: null,
    isolate: false,
    xray: false,
    explode: 0,
    cutaway: false,
    schematic: false,
    labels: 'main',
    step: 0,
    playing: false,
    ghost: true,
    autoFrame: true,
    lesson: null,
    sheet: false,
    panelOpen: true,
    drawing: null,
  });
}
