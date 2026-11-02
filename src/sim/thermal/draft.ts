import { airRho } from './air';

// What moves a gas with no fan: the weight difference between a warm column and the still air beside it, against the friction of the path.
// Plain functions of plain numbers; temperatures in °C, pressures in Pa, flows in kg/s.

export const GRAVITY = 9.81;

/**
 * The draft of a column of height `H`, Pa: g·H·(ρ_beside − ρ_in). Positive when the column is lighter than the air beside it (it pulls up),
 * negative when it is heavier (it pushes down).
 */
export const stackDraft = (H: number, Tin: number, Tbeside: number): number =>
  GRAVITY * H * (airRho(Tbeside) - airRho(Tin));

/** One velocity head of a flow through a section, Pa: ṁ²/(2ρA²). Multiply by a loss coefficient. */
export const velocityHead = (mdot: number, A: number, rho: number): number => (mdot * mdot) / (2 * rho * A * A);

/**
 * The flow of a loop driven by buoyancy, with its sign, found by walking from the previous flow in the direction the pressure pushes.
 * `residual(m)` is the net pressure at flow `m` (drive minus losses, with the sign of a push towards positive flow): the loop speeds up where it is
 * positive. A loop with two stable answers, one each way, is a real thing (a warm flue pulls, a cold one pours down): walking from the previous flow
 * keeps the branch the loop is on, and it only changes when that branch stops existing. A flow pinned between a push from each side comes out at zero.
 * `tol` is on the flow; `pressureTol`, Pa, accepts the previous flow at once when it is still good. Allocates nothing; a dozen evaluations of `residual` at most.
 */
export function solveLoopFlow(
  residual: (m: number) => number,
  previous: number,
  max: number,
  tol = 1e-5,
  pressureTol = 0,
): number {
  const clamp = (m: number): number => Math.max(-max, Math.min(max, m));
  let a = clamp(previous);
  let Ra = residual(a);
  if (Math.abs(Ra) <= pressureTol) return a;
  const dir = Ra > 0 ? 1 : -1;
  let step = Math.max(Math.abs(a) * 0.15, 20 * tol);
  let b = a;
  let Rb = Ra;
  for (let i = 0; i < 24; i++) {
    b = clamp(a + dir * step);
    Rb = residual(b);
    if (Math.abs(Rb) <= pressureTol) return b;
    if (Rb > 0 !== Ra > 0) break;
    if (b === a) return b; // at the limit and still pushed
    a = b;
    Ra = Rb;
    step *= 2;
  }
  if (Rb > 0 === Ra > 0) return b;
  // the Illinois variant of the false position: the bracket shrinks from both sides
  for (let i = 0; i < 14 && Math.abs(b - a) > tol; i++) {
    let c = b - (Rb * (b - a)) / (Rb - Ra);
    if (!(c > Math.min(a, b) && c < Math.max(a, b))) c = (a + b) / 2;
    const Rc = residual(c);
    if (Math.abs(Rc) <= pressureTol) return c;
    if (Rc > 0 === Rb > 0) {
      Ra *= 0.5;
    } else {
      a = b;
      Ra = Rb;
    }
    b = c;
    Rb = Rc;
  }
  return Math.abs(Ra) < Math.abs(Rb) ? a : b;
}
