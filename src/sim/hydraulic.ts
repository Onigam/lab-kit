// Hydraulic helpers (SI units unless stated): pure functions, free of state, so a lab can reuse
// them for steady-state sweeps as well as for its real-time model.

export const G = 9.81;
export const RHO = 1000;
export const NU = 1.31e-6; // kinematic viscosity of water at 10 °C
export const WAVE_SPEED_HDPE = 350; // pressure wave celerity in HDPE pipe, m/s

/** Darcy friction factor (Swamee–Jain, laminar fallback). */
export function frictionFactor(v: number, d: number, roughness = 7e-6): number {
  const re = (Math.abs(v) * d) / NU;
  if (re < 1) return 0.05;
  if (re < 2300) return 64 / re;
  const a = roughness / (3.7 * d) + 5.74 / Math.pow(re, 0.9);
  return 0.25 / Math.pow(Math.log10(a), 2);
}

/** Friction head loss in a pipe (m). */
export function frictionLoss(q: number, d: number, len: number): number {
  const area = (Math.PI * d * d) / 4;
  const v = q / area;
  return (frictionFactor(v, d) * (len / d) * (v * v)) / (2 * G);
}

/** Loss coefficient of a quarter-turn ball valve as a function of its opening (0..1). */
export function ballValveK(pos: number): number {
  const p = Math.max(pos, 0.004);
  return 0.05 + 50 * Math.pow((1 - p) / p, 2);
}

/** Nozzle area (m²) for a diameter in mm, including the discharge coefficient. */
export function nozzleArea(dMm: number, cd = 0.96): number {
  const d = dMm / 1000;
  return (cd * (Math.PI * d * d)) / 4;
}
