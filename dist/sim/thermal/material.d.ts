export interface Material {
    readonly name: string;
    /** Density as used (a bulk density for a granular material), kg/m³. */
    readonly rho: number;
    /** Specific heat, J/kg·K. */
    c(T: number): number;
    /** Specific enthalpy above 0 °C, J/kg. */
    h(T: number): number;
    /** The temperature of a specific enthalpy: the exact inverse of `h`. */
    Tof(h: number): number;
    /** Conductivity, W/m·K. */
    k(T: number): number;
}
/** A curve given by points, straight between them and straight beyond the two ends (slope of the last segment). */
export declare function piecewise(points: readonly (readonly [number, number])[]): (x: number) => number;
export interface MaterialSpec {
    name: string;
    rho: number;
    c: (T: number) => number;
    k: (T: number) => number;
    /** Range of the enthalpy table, °C, and its step, K. Outside the range the end values of c carry on. */
    Tmin?: number;
    Tmax?: number;
    dT?: number;
}
/**
 * A material from any c(T): the enthalpy is tabulated once, then read by straight interpolation both ways, so that
 * `Tof(h(T)) === T` to rounding, whatever the curve. A lookup costs a dozen comparisons at most.
 */
export declare function makeMaterial(spec: MaterialSpec): Material;
/** A material with constant properties: h and T are one multiplication apart. */
export declare function constantMaterial(name: string, rho: number, c: number, k: number): Material;
/**
 * Specific heat of a quartz sand, measured, J/kg·K: Juul (KTH, 2023) from 60 to 500 °C; the 600 °C point is another measured sand,
 * Baumann & Zunft (DLR, 2015), which gives 1,187 there. Below 60 °C the first slope carries on, which gives 725 at 20 °C (pure quartz: 732).
 */
export declare const QUARTZ_SAND_C: readonly (readonly [number, number])[];
/** Conductivity of the same sand as a bed, W/m·K, measured (Juul 2023): it rises with temperature through radiation between grains. */
export declare const QUARTZ_SAND_K: readonly (readonly [number, number])[];
/**
 * Specific heat of pure quartz, J/kg·K, T in °C: the fit to the NIST-JANAF table published by Hinkelman, Milner & Zuo (2023), up to the
 * 573 °C inversion, then their second branch.
 */
export declare function quartzNistC(T: number): number;
/** Quartz sand as a bed. `rho` defaults to the measured bulk density (Juul 2023). `kScale` multiplies the measured conductivity. */
export declare function quartzSand(rho?: number, kScale?: number): Material;
/** Pure quartz by the NIST fit, same bed conductivity: the second curve for a sand, to see how much the choice of curve weighs. */
export declare function quartzPure(rho?: number, kScale?: number): Material;
/**
 * Crushed soapstone as a bed. c = 1,000 J/kg·K: an unreferenced value from a heater maker (0.98 to 1.0), its change with temperature
 * is unknown. k = 0.7 W/m·K: an estimate (0.5 to 1.0), no measurement of a bed found.
 */
export declare function crushedSoapstone(rho?: number, kBed?: number, c?: number): Material;
/** Liquid water, usual values. Latent heat is not modelled: this is for a tank or a circuit below boiling. */
export declare function liquidWater(): Material;
