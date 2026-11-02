export interface Layer {
    /** Thickness, m. */
    thickness: number;
    /** Conductivity, W/m·K. */
    lambda: number;
}
/** Overall coefficient of plane layers in series with a film on each side, W/m²·K. A film of `Infinity` adds nothing. */
export declare function seriesU(layers: readonly Layer[], filmIn?: number, filmOut?: number): number;
/** Heat lost through a surface, W. */
export declare const surfaceLoss: (U: number, A: number, T: number, Tamb: number) => number;
/** Heat carried by a flow across a temperature difference, W. */
export declare const flowHeat: (mdot: number, cp: number, dT: number) => number;
export type Arrangement = 'counter' | 'parallel' | 'cross';
/** Effectiveness of an exchanger by the ε-NTU relations. `cross` is the usual fit for both streams unmixed. */
export declare function effectiveness(UA: number, Cmin: number, Cmax: number, arrangement?: Arrangement): number;
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
export declare function fluidLine(order: ArrayLike<number>, T: ArrayLike<number>, G: ArrayLike<number>, C: number, out: LineCoefficients): void;
/**
 * The same crossing with a known inlet: adds to `Q` the heat each node receives, W, and returns the outlet temperature.
 * T_out = T_node + (T_in − T_node)·exp(−G/C) on each stretch.
 */
export declare function marchFluid(Tin: number, order: ArrayLike<number>, T: ArrayLike<number>, G: ArrayLike<number>, C: number, Q?: Float64Array): number;
/**
 * The resistance factor of a cell of medium around a pipe, uniformly heated, no flux at its edge: the wall to the mean temperature of the
 * cell is (1/2πk)·B per metre. B = ln(R/r)/(1 − x²)² − (3 − x²)/(4(1 − x²)), x = r/R. It tends to the familiar ln(R/r) − 3/4 when R is far
 * above r, and is 10 % above it at R/r = 5.6.
 */
export declare function pipeCellFactor(R: number, r: number): number;
/** Conductance between a pipe wall and the mean temperature of the cylinder of medium around it, quasi-steady regime, W/K. */
export declare function pipeCellConductance(k: number, L: number, R: number, r: number): number;
/** Radius of the cylinder that has the area of a square pitch, m. */
export declare const pitchRadius: (pitch: number) => number;
/** Time constant of such a cell, s: its heat capacity over its conductance. Below this time the quasi-steady regime does not hold. */
export declare function pipeCellTime(k: number, rhoC: number, R: number, r: number): number;
/**
 * Shape of the quasi-steady temperature around such a pipe: 0 at the wall r0, 1 at the mean temperature of the cell. A fine profile for a
 * magnified view, consistent with `pipeCellConductance`: T(ρ) = T_wall + (T_mean − T_wall)·shape(ρ).
 */
export declare function pipeCellShape(rho: number, R: number, r0: number): number;
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
export declare const RE_LAMINAR = 2300;
/** Darcy friction factor of a smooth tube: 64/Re when laminar, Petukhov when turbulent. */
export declare const tubeFriction: (Re: number) => number;
/** Nusselt number of a tube: 3.66 when laminar, Gnielinski when turbulent (never below 3.66). `f` is the friction factor at this Re. */
export declare function tubeNusselt(Re: number, f: number, Pr: number): number;
/**
 * A fluid in a smooth tube: Petukhov's friction and Gnielinski's Nusselt number when turbulent, 64/Re and 3.66 when laminar (the larger
 * Nusselt number of the two is kept across the transition).
 */
export declare function tubeFlow(mdot: number, D: number, gas: GasProperties): TubeFlow;
/** Pressure drop of a stretch of tube, Pa: Darcy-Weisbach. */
export declare const tubePressureDrop: (flow: TubeFlow, length: number, D: number, rho: number) => number;
