// UI state shared by every panel. A tiny observable store; the 3D display logic and
// the panels read from it, controls write to it.
export class Store {
    state;
    listeners = new Set();
    constructor(state) {
        this.state = state;
    }
    set(patch) {
        const prev = this.state;
        this.state = { ...prev, ...patch };
        this.listeners.forEach((fn) => fn(this.state, prev));
    }
    on(fn) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }
}
/** A fresh store with the lab's starting world. */
export function createStore(scene) {
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
