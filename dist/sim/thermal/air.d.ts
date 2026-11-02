/** Density, kg/m³. */
export declare const airRho: (T: number, p?: number) => number;
/** Specific heat at constant pressure, J/kg·K. */
export declare const airCp: (T: number) => number;
/** Dynamic viscosity, Pa·s (Sutherland). */
export declare function airMu(T: number): number;
/** Conductivity, W/m·K. */
export declare const airK: (T: number) => number;
/** Prandtl number. */
export declare const airPr: (T: number) => number;
