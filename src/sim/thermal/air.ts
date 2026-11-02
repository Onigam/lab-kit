// Air as a heat carrier, at about atmospheric pressure. Usual engineering values (ideal gas, Sutherland's law, a fit to the
// standard air tables within 1 % from 0 to 700 °C). T in °C.

const R_AIR = 287.05;
const P_ATM = 101325;

/** Density, kg/m³. */
export const airRho = (T: number, p = P_ATM): number => p / (R_AIR * (T + 273.15));

/** Specific heat at constant pressure, J/kg·K. */
export const airCp = (T: number): number => 1002 + 0.04 * T + 0.00026 * T * T;

/** Dynamic viscosity, Pa·s (Sutherland). */
export function airMu(T: number): number {
  const K = T + 273.15;
  return 1.716e-5 * Math.pow(K / 273.15, 1.5) * ((273.15 + 110.4) / (K + 110.4));
}

/** Conductivity, W/m·K. */
export const airK = (T: number): number => 0.0241 * Math.pow((T + 273.15) / 273.15, 0.81);

/** Prandtl number. */
export const airPr = (T: number): number => (airMu(T) * airCp(T)) / airK(T);
