/**
 * Mix the unstable layers of a column, in place, conserving Σ w·T: layer 0 is the bottom one, `T` its temperature, `w` its heat capacity.
 * The result is the closest stable column (a "pool adjacent violators" pass, in one sweep). Returns the number of layers changed.
 */
export declare function buoyancyMix(T: Float64Array | number[], w: ArrayLike<number>): number;
