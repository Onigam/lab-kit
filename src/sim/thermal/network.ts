import type { Material } from './material';

// An RC network: nodes that hold heat, links that pass it. A node is either a mass of a material (its state is its enthalpy, so energy
// is conserved while c changes with T), or a plain heat capacity, or a fixed temperature (the outside, the ground), which keeps count
// of the energy it received. A link is a series of up to three resistances: a fixed one, and a conduction path on each side whose
// conductivity is read at that node's temperature.
//
// Functions below change only the network passed to them, in place and without allocating, so that a step stays cheap on a phone; nothing
// lives at module level.

export interface NodeSpec {
  /** Initial temperature, °C. */
  T: number;
  /** A mass of a material… */
  mass?: number;
  material?: Material;
  /** …or a plain heat capacity, J/K… */
  capacity?: number;
  /** …or a boundary held at its temperature. */
  fixed?: boolean;
}

export interface LinkSpec {
  a: number;
  b: number;
  /** A fixed conductance, W/K (a film, an insulation), in series with the two sides below. */
  G?: number;
  /** Shape factor of the conduction path on the side of `a`, m (area over length): conductance = k(T_a)·shapeA. */
  shapeA?: number;
  /** The same on the side of `b`. */
  shapeB?: number;
}

export interface RCNetwork {
  readonly n: number;
  readonly mass: Float64Array;
  readonly material: (Material | null)[];
  /** J/K, plain capacities only. */
  readonly capacity: Float64Array;
  readonly fixed: Uint8Array;
  /** Temperature of each node, °C. A fixed node may be written directly. */
  readonly T: Float64Array;
  /** Enthalpy of each node, J (0 for a fixed node). */
  readonly H: Float64Array;
  /** Heat applied to each node during the next step, W. Stays until the caller changes it. */
  readonly Q: Float64Array;
  /** Energy each fixed node has received since the start, J (the sum of all of them closes the balance). */
  readonly boundaryEnergy: Float64Array;
  readonly linkA: Int32Array;
  readonly linkB: Int32Array;
  readonly linkR: Float64Array;
  readonly shapeA: Float64Array;
  readonly shapeB: Float64Array;
  /** Conductance of each link at the last update, W/K. */
  readonly linkG: Float64Array;
  /** A work array: the sum of the conductances at each node. */
  readonly sumG: Float64Array;
  /** A work array: the flow into each node during a substep, W. */
  readonly flow: Float64Array;
}

export function createNetwork(nodes: readonly NodeSpec[], links: readonly LinkSpec[]): RCNetwork {
  const n = nodes.length;
  const m = links.length;
  const net: RCNetwork = {
    n,
    mass: new Float64Array(n),
    material: new Array<Material | null>(n).fill(null),
    capacity: new Float64Array(n),
    fixed: new Uint8Array(n),
    T: new Float64Array(n),
    H: new Float64Array(n),
    Q: new Float64Array(n),
    boundaryEnergy: new Float64Array(n),
    linkA: new Int32Array(m),
    linkB: new Int32Array(m),
    linkR: new Float64Array(m),
    shapeA: new Float64Array(m),
    shapeB: new Float64Array(m),
    linkG: new Float64Array(m),
    sumG: new Float64Array(n),
    flow: new Float64Array(n),
  };
  nodes.forEach((s, i) => {
    if (s.fixed) net.fixed[i] = 1;
    else if (s.material) {
      net.material[i] = s.material;
      net.mass[i] = s.mass ?? 0;
    } else net.capacity[i] = s.capacity ?? 0;
    setNodeTemperature(net, i, s.T);
  });
  links.forEach((l, i) => {
    net.linkA[i] = l.a;
    net.linkB[i] = l.b;
    net.linkR[i] = l.G ? 1 / l.G : 0;
    net.shapeA[i] = l.shapeA ?? 0;
    net.shapeB[i] = l.shapeB ?? 0;
  });
  updateConductances(net);
  return net;
}

/** Set the temperature of a node and the enthalpy that goes with it. */
export function setNodeTemperature(net: RCNetwork, i: number, T: number): void {
  net.T[i] = T;
  if (net.fixed[i]) return;
  const mat = net.material[i];
  net.H[i] = mat ? net.mass[i]! * mat.h(T) : net.capacity[i]! * T;
}

/** Change the fixed conductance of a link without rebuilding the network, W/K. */
export function setLinkConductance(net: RCNetwork, link: number, G: number): void {
  net.linkR[link] = G > 0 ? 1 / G : Number.POSITIVE_INFINITY;
}

/** Read every conductance at the present temperatures. */
export function updateConductances(net: RCNetwork): void {
  const { linkA, linkB, linkR, shapeA, shapeB, linkG, material, T } = net;
  for (let l = 0; l < linkG.length; l++) {
    let R = linkR[l]!;
    const a = linkA[l]!;
    const b = linkB[l]!;
    const sa = shapeA[l]!;
    const sb = shapeB[l]!;
    if (sa > 0) R += 1 / (material[a]!.k(T[a]!) * sa);
    if (sb > 0) R += 1 / (material[b]!.k(T[b]!) * sb);
    linkG[l] = R > 0 ? 1 / R : 0;
  }
}

/** Heat capacity of a node at its present temperature, J/K. */
export function nodeCapacity(net: RCNetwork, i: number): number {
  const mat = net.material[i];
  return mat ? net.mass[i]! * mat.c(net.T[i]!) : net.capacity[i]!;
}

/** The longest explicit step that stays stable at the present temperatures, s. */
export function stableStep(net: RCNetwork): number {
  const { n, sumG, linkA, linkB, linkG, fixed } = net;
  sumG.fill(0);
  for (let l = 0; l < linkG.length; l++) {
    sumG[linkA[l]!]! += linkG[l]!;
    sumG[linkB[l]!]! += linkG[l]!;
  }
  let dt = Number.POSITIVE_INFINITY;
  for (let i = 0; i < n; i++) {
    if (fixed[i] || sumG[i]! <= 0) continue;
    const limit = nodeCapacity(net, i) / sumG[i]!;
    if (limit < dt) dt = limit;
  }
  // an explicit step is stable below C / ΣG on a one-dimensional chain and on any network whose node sums are read this way: keep a margin
  return 0.5 * dt;
}

/**
 * Move heat for `dt` seconds along the links and from `net.Q`, in as many equal substeps as stability asks. Energy is conserved to
 * rounding whatever the conductances do: each link takes from one node what it gives to the other. Returns the number of substeps.
 */
export function stepNetwork(net: RCNetwork, dt: number): number {
  updateConductances(net);
  const steps = Math.max(1, Math.ceil(dt / stableStep(net)));
  const h = dt / steps;
  const { n, T, H, Q, flow, fixed, mass, capacity, material, boundaryEnergy, linkA, linkB, linkG } = net;
  const links = linkG.length;
  for (let s = 0; s < steps; s++) {
    flow.fill(0);
    for (let l = 0; l < links; l++) {
      const a = linkA[l]!;
      const b = linkB[l]!;
      const q = linkG[l]! * (T[a]! - T[b]!);
      flow[a]! -= q;
      flow[b]! += q;
    }
    for (let i = 0; i < n; i++) {
      const q = flow[i]! + Q[i]!;
      if (fixed[i]) {
        boundaryEnergy[i]! += q * h;
        continue;
      }
      if (q === 0) continue;
      H[i]! += q * h;
      const mat = material[i];
      T[i] = mat ? mat.Tof(H[i]! / mass[i]!) : H[i]! / capacity[i]!;
    }
  }
  return steps;
}

/** The sum of the enthalpies of the nodes that are not fixed, J. */
export function totalEnthalpy(net: RCNetwork): number {
  let e = 0;
  for (let i = 0; i < net.n; i++) e += net.H[i]!;
  return e;
}

/** The sum of the energy received by all the fixed nodes, J. */
export function totalBoundaryEnergy(net: RCNetwork): number {
  let e = 0;
  for (let i = 0; i < net.n; i++) e += net.boundaryEnergy[i]!;
  return e;
}
