// Electrical helpers: a LiFePO4 48 V battery curve and cable resistance.

export const CU_RHO = 0.0175; // copper resistivity, Ω·mm²/m

/** 15S LiFePO4 open-circuit voltage vs state of charge (Pylontech-like). */
const OCV: [number, number][] = [
  [0, 44.0],
  [0.05, 47.0],
  [0.1, 48.6],
  [0.2, 49.6],
  [0.4, 50.4],
  [0.6, 50.9],
  [0.8, 51.6],
  [0.9, 52.2],
  [0.97, 53.0],
  [1, 54.0],
];

export function ocv(soc: number): number {
  const s = Math.min(1, Math.max(0, soc));
  for (let i = 1; i < OCV.length; i++) {
    if (s <= OCV[i][0]) {
      const [s0, v0] = OCV[i - 1];
      const [s1, v1] = OCV[i];
      return v0 + ((v1 - v0) * (s - s0)) / (s1 - s0);
    }
  }
  return OCV[OCV.length - 1][1];
}

/** Cable loop resistance (Ω) for a one-way length (m) and a section (mm²). */
export function cableResistance(len: number, section: number): number {
  return (CU_RHO * 2 * len) / section;
}
