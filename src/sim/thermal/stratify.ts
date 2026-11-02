// Stratification of a FLUID tank: warm fluid sits above cold fluid, and a layer warmer than the one above it rises at once and mixes.
//
// A packed bed is not a tank. Stone does not convect: its layers and gradients come from slow conduction and from where the heat was put
// (a `Grid` and the order of charge), and nothing here applies to it. This is the piece a water tank needs on top of the same network.

/**
 * Mix the unstable layers of a column, in place, conserving Σ w·T: layer 0 is the bottom one, `T` its temperature, `w` its heat capacity.
 * The result is the closest stable column (a "pool adjacent violators" pass, in one sweep). Returns the number of layers changed.
 */
export function buoyancyMix(T: Float64Array | number[], w: ArrayLike<number>): number {
  const n = T.length;
  const startOf: number[] = [];
  const pool: number[] = [];
  const weight: number[] = [];
  for (let i = 0; i < n; i++) {
    let start = i;
    let t = T[i]!;
    let c = w[i]!;
    // a block warmer than this layer sits below it: they merge
    while (pool.length > 0 && pool[pool.length - 1]! > t) {
      const w0 = weight.pop()!;
      t = (pool.pop()! * w0 + t * c) / (w0 + c);
      c += w0;
      start = startOf.pop()!;
    }
    startOf.push(start);
    pool.push(t);
    weight.push(c);
  }
  let changed = 0;
  for (let b = 0; b < pool.length; b++) {
    const end = b + 1 < pool.length ? startOf[b + 1]! : n;
    for (let i = startOf[b]!; i < end; i++) {
      if (T[i] !== pool[b]!) changed++;
      T[i] = pool[b]!;
    }
  }
  return changed;
}
