// What passes heat from one thing to another: insulation in layers, a fluid crossing a mass, an exchanger, a buried pipe. Plain functions of
// plain numbers. Temperatures in °C, conductances in W/K, capacity rates (mass flow times specific heat) in W/K.

export interface Layer {
  /** Thickness, m. */
  thickness: number;
  /** Conductivity, W/m·K. */
  lambda: number;
}

/** Overall coefficient of plane layers in series with a film on each side, W/m²·K. A film of `Infinity` adds nothing. */
export function seriesU(layers: readonly Layer[], filmIn = Infinity, filmOut = Infinity): number {
  let R = 1 / filmIn + 1 / filmOut;
  for (const l of layers) R += l.thickness / l.lambda;
  return R > 0 ? 1 / R : Infinity;
}

/** Heat lost through a surface, W. */
export const surfaceLoss = (U: number, A: number, T: number, Tamb: number): number => U * A * (T - Tamb);

/** Heat carried by a flow across a temperature difference, W. */
export const flowHeat = (mdot: number, cp: number, dT: number): number => mdot * cp * dT;

export type Arrangement = 'counter' | 'parallel' | 'cross';

/** Effectiveness of an exchanger by the ε-NTU relations. `cross` is the usual fit for both streams unmixed. */
export function effectiveness(UA: number, Cmin: number, Cmax: number, arrangement: Arrangement = 'counter'): number {
  if (Cmin <= 0 || UA <= 0) return 0;
  const ntu = UA / Cmin;
  const cr = Cmin / Cmax;
  if (cr < 1e-6) return 1 - Math.exp(-ntu);
  if (arrangement === 'parallel') return (1 - Math.exp(-ntu * (1 + cr))) / (1 + cr);
  if (arrangement === 'cross') {
    return 1 - Math.exp((Math.pow(ntu, 0.22) / cr) * (Math.exp(-cr * Math.pow(ntu, 0.78)) - 1));
  }
  if (Math.abs(1 - cr) < 1e-6) return ntu / (1 + ntu);
  const e = Math.exp(-ntu * (1 - cr));
  return (1 - e) / (1 - cr * e);
}

/** Result of `fluidLine`: the outlet temperature is `A + B·T_in`. */
export interface LineCoefficients {
  A: number;
  B: number;
}

/**
 * A fluid crossing a series of nodes, each at its own temperature: outlet = A + B·inlet. Linear in the inlet, so a closed loop can
 * be solved in one pass. `order` lists the nodes on the path (one may appear twice), `G` the conductance along each stretch of the path,
 * `C` is the capacity rate of the fluid. The nodes are taken as constant during the crossing: a fluid holds far less heat than a mass.
 */
export function fluidLine(
  order: ArrayLike<number>,
  T: ArrayLike<number>,
  G: ArrayLike<number>,
  C: number,
  out: LineCoefficients,
): void {
  let A = 0;
  let B = 1;
  for (let s = 0; s < order.length; s++) {
    const e = Math.exp(-G[s]! / C);
    A = e * A + (1 - e) * T[order[s]!]!;
    B *= e;
  }
  out.A = A;
  out.B = B;
}

/**
 * The same crossing with a known inlet: adds to `Q` the heat each node receives, W, and returns the outlet temperature.
 * T_out = T_node + (T_in − T_node)·exp(−G/C) on each stretch.
 */
export function marchFluid(
  Tin: number,
  order: ArrayLike<number>,
  T: ArrayLike<number>,
  G: ArrayLike<number>,
  C: number,
  Q?: Float64Array,
): number {
  let t = Tin;
  for (let s = 0; s < order.length; s++) {
    const node = order[s]!;
    const next = T[node]! + (t - T[node]!) * Math.exp(-G[s]! / C);
    if (Q) Q[node]! += C * (t - next);
    t = next;
  }
  return t;
}

/**
 * The resistance factor of a cell of medium around a pipe, uniformly heated, no flux at its edge: the wall to the mean temperature of the
 * cell is (1/2πk)·B per metre. B = ln(R/r)/(1 − x²)² − (3 − x²)/(4(1 − x²)), x = r/R. It tends to the familiar ln(R/r) − 3/4 when R is far
 * above r, and is 10 % above it at R/r = 5.6.
 */
export function pipeCellFactor(R: number, r: number): number {
  const x2 = (r * r) / (R * R);
  const a = 1 - x2;
  return Math.log(R / r) / (a * a) - (3 - x2) / (4 * a);
}

/** Conductance between a pipe wall and the mean temperature of the cylinder of medium around it, quasi-steady regime, W/K. */
export function pipeCellConductance(k: number, L: number, R: number, r: number): number {
  return (2 * Math.PI * k * L) / pipeCellFactor(R, r);
}

/** Radius of the cylinder that has the area of a square pitch, m. */
export const pitchRadius = (pitch: number): number => pitch / Math.sqrt(Math.PI);

/** Time constant of such a cell, s: its heat capacity over its conductance. Below this time the quasi-steady regime does not hold. */
export function pipeCellTime(k: number, rhoC: number, R: number, r: number): number {
  return (rhoC * (R * R - r * r) * pipeCellFactor(R, r)) / (2 * k);
}

/**
 * Shape of the quasi-steady temperature around such a pipe: 0 at the wall r0, 1 at the mean temperature of the cell. A fine profile for a
 * magnified view, consistent with `pipeCellConductance`: T(ρ) = T_wall + (T_mean − T_wall)·shape(ρ).
 */
export function pipeCellShape(rho: number, R: number, r0: number): number {
  const x = Math.max(r0, Math.min(rho, R));
  const a = R * R - r0 * r0;
  const f = (R * R * Math.log(x / r0)) / a - (x * x - r0 * r0) / (2 * a);
  return f / pipeCellFactor(R, r0);
}

export interface GasProperties {
  rho: number;
  mu: number;
  k: number;
  Pr: number;
}

export interface TubeFlow {
  velocity: number;
  Re: number;
  /** Darcy friction factor. */
  f: number;
  /** Film coefficient, W/m²·K. */
  h: number;
}

/** Laminar below this Reynolds number, turbulent above. Both laws jump there: nothing in this file smooths the transition. */
export const RE_LAMINAR = 2300;

/** Darcy friction factor of a smooth tube: 64/Re when laminar, Petukhov when turbulent. */
export const tubeFriction = (Re: number): number =>
  Re < RE_LAMINAR ? 64 / Re : Math.pow(0.79 * Math.log(Re) - 1.64, -2);

/** Nusselt number of a tube: 3.66 when laminar, Gnielinski when turbulent (never below 3.66). `f` is the friction factor at this Re. */
export function tubeNusselt(Re: number, f: number, Pr: number): number {
  if (Re < RE_LAMINAR) return 3.66;
  const g = f / 8;
  return Math.max(3.66, (g * (Re - 1000) * Pr) / (1 + 12.7 * Math.sqrt(g) * (Math.pow(Pr, 2 / 3) - 1)));
}

/**
 * A fluid in a smooth tube: Petukhov's friction and Gnielinski's Nusselt number when turbulent, 64/Re and 3.66 when laminar (the larger
 * Nusselt number of the two is kept across the transition).
 */
export function tubeFlow(mdot: number, D: number, gas: GasProperties): TubeFlow {
  const A = (Math.PI * D * D) / 4;
  const Re = Math.max((mdot * D) / (A * gas.mu), 1);
  const velocity = mdot / (gas.rho * A);
  const f = tubeFriction(Re);
  const Nu = tubeNusselt(Re, f, gas.Pr);
  return { velocity, Re, f, h: (Nu * gas.k) / D };
}

/** Pressure drop of a stretch of tube, Pa: Darcy-Weisbach. */
export const tubePressureDrop = (flow: TubeFlow, length: number, D: number, rho: number): number =>
  (flow.f * length * rho * flow.velocity * flow.velocity) / (2 * D);
