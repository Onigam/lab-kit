export declare const G = 9.81;
export declare const RHO = 1000;
export declare const NU = 0.00000131;
export declare const WAVE_SPEED_HDPE = 350;
/** Darcy friction factor (Swamee–Jain, laminar fallback). */
export declare function frictionFactor(v: number, d: number, roughness?: number): number;
/** Friction head loss in a pipe (m). */
export declare function frictionLoss(q: number, d: number, len: number): number;
/** Loss coefficient of a quarter-turn ball valve as a function of its opening (0..1). */
export declare function ballValveK(pos: number): number;
/** Nozzle area (m²) for a diameter in mm, including the discharge coefficient. */
export declare function nozzleArea(dMm: number, cd?: number): number;
