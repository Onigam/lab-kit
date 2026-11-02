export declare const GRAVITY = 9.81;
/**
 * The draft of a column of height `H`, Pa: g·H·(ρ_beside − ρ_in). Positive when the column is lighter than the air beside it (it pulls up),
 * negative when it is heavier (it pushes down).
 */
export declare const stackDraft: (H: number, Tin: number, Tbeside: number) => number;
/** One velocity head of a flow through a section, Pa: ṁ²/(2ρA²). Multiply by a loss coefficient. */
export declare const velocityHead: (mdot: number, A: number, rho: number) => number;
/**
 * The flow of a loop driven by buoyancy, with its sign, found by walking from the previous flow in the direction the pressure pushes.
 * `residual(m)` is the net pressure at flow `m` (drive minus losses, with the sign of a push towards positive flow): the loop speeds up where it is
 * positive. A loop with two stable answers, one each way, is a real thing (a warm flue pulls, a cold one pours down): walking from the previous flow
 * keeps the branch the loop is on, and it only changes when that branch stops existing. A flow pinned between a push from each side comes out at zero.
 * `tol` is on the flow; `pressureTol`, Pa, accepts the previous flow at once when it is still good. Allocates nothing; a dozen evaluations of `residual` at most.
 */
export declare function solveLoopFlow(residual: (m: number) => number, previous: number, max: number, tol?: number, pressureTol?: number): number;
