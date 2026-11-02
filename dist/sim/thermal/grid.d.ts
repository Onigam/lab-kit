import type { Material } from './material';
import type { LinkSpec, NodeSpec } from './network';
export type GridGeometry = 'rz' | 'xy';
export interface GridSpec {
    geometry: GridGeometry;
    /** Edges along x or r, m, increasing (from 0 on the axis for a cylinder). */
    xEdges: readonly number[];
    /** Edges along y or z, m, increasing. */
    yEdges: readonly number[];
    /** Depth of a plane grid, m (default 1). */
    depth?: number;
    material: Material;
    /** Initial temperature, °C. */
    T: number;
}
export interface GridFace {
    /** The node on the boundary. */
    node: number;
    /** Area of its face on that side, m². */
    area: number;
    /** Shape factor of the half-cell behind the face, m: conductance = k(T)·shape. */
    shape: number;
}
export type GridSide = 'xMin' | 'xMax' | 'yMin' | 'yMax';
export interface Grid {
    readonly nx: number;
    readonly ny: number;
    readonly nodes: NodeSpec[];
    readonly links: LinkSpec[];
    /** Node of cell (i, j). */
    id(i: number, j: number): number;
    /** Volume of each cell, m³. */
    readonly volume: Float64Array;
    /** The outer faces of a side, with what a boundary link needs. */
    faces(side: GridSide): GridFace[];
    readonly xCenter: Float64Array;
    readonly yCenter: Float64Array;
}
/** `n + 1` evenly spaced edges from 0 to `length`. */
export declare const uniformEdges: (length: number, n: number) => number[];
export declare function buildGrid(spec: GridSpec): Grid;
