// Heat that crosses a room without touching the air, and the film of still air on a warm surface. Temperatures in °C, conductances in W/K.

export const SIGMA = 5.670374e-8;
const KELVIN = 273.15;

/**
 * The radiation between two surfaces written as a conductance, W/K: ε·σ·A·(T₁² + T₂²)(T₁ + T₂), in kelvins. It changes with the temperatures: read it
 * again at each step (`setLinkConductance`). Multiplied by (T₁ − T₂) it gives exactly ε·σ·A·(T₁⁴ − T₂⁴).
 */
export function radiationConductance(emissivity: number, area: number, T1: number, T2: number): number {
  const a = T1 + KELVIN;
  const b = T2 + KELVIN;
  return emissivity * SIGMA * area * (a * a + b * b) * (a + b);
}

/** The effective emissivity of a surface 1 inside a surface 2 that surrounds it (concentric cylinders, a body in a room). */
export function enclosedEmissivity(e1: number, A1: number, e2: number, A2: number): number {
  return 1 / (1 / e1 + (A1 / A2) * (1 / e2 - 1));
}

/** Coefficients of the simplified film of still air at room temperature, usual values: h = C·|ΔT|^(1/3), W/m²·K. */
export const FILM_VERTICAL = 1.31;
export const FILM_FACING_UP = 1.52;

/** The film of natural convection on a surface, turbulent regime, W/m²·K. */
export const naturalFilm = (dT: number, C: number = FILM_VERTICAL): number => C * Math.cbrt(Math.abs(dT));
