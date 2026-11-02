import type { Material } from './material';
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
export declare function createNetwork(nodes: readonly NodeSpec[], links: readonly LinkSpec[]): RCNetwork;
/** Set the temperature of a node and the enthalpy that goes with it. */
export declare function setNodeTemperature(net: RCNetwork, i: number, T: number): void;
/** Change the fixed conductance of a link without rebuilding the network, W/K. */
export declare function setLinkConductance(net: RCNetwork, link: number, G: number): void;
/** Read every conductance at the present temperatures. */
export declare function updateConductances(net: RCNetwork): void;
/** Heat capacity of a node at its present temperature, J/K. */
export declare function nodeCapacity(net: RCNetwork, i: number): number;
/** The longest explicit step that stays stable at the present temperatures, s. */
export declare function stableStep(net: RCNetwork): number;
/**
 * Move heat for `dt` seconds along the links and from `net.Q`, in as many equal substeps as stability asks. Energy is conserved to
 * rounding whatever the conductances do: each link takes from one node what it gives to the other. Returns the number of substeps.
 */
export declare function stepNetwork(net: RCNetwork, dt: number): number;
/** The sum of the enthalpies of the nodes that are not fixed, J. */
export declare function totalEnthalpy(net: RCNetwork): number;
/** The sum of the energy received by all the fixed nodes, J. */
export declare function totalBoundaryEnergy(net: RCNetwork): number;
