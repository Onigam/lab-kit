// The thermal core: an RC network with enthalpy nodes and temperature-dependent conduction, grids of massive bodies, what passes heat
// between things, the draft of a warm column, radiation and the film of still air, a false-colour ramp, and the stratification of a fluid
// tank. Pure functions and plain data: no DOM, no three.js, no import from a lab or from the rest of the kit.
//
// Units: SI, temperatures in °C. Docs and limits: `docs/sim-thermal.md`.

export * from './air';
export * from './draft';
export * from './exchange';
export * from './grid';
export * from './material';
export * from './network';
export * from './radiation';
export * from './ramp';
export * from './stratify';
