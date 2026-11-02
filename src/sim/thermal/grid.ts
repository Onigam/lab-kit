import type { Material } from './material';
import type { LinkSpec, NodeSpec } from './network';

// A conduction grid of a massive body, on a plane (x, y) or in a cylinder (r, z), written as nodes and links of an RC network. The cells
// of a cylinder are rings; each half-cell uses the exact logarithmic conductance of a ring, so the first decay mode of a cylinder comes
// out right with few rings.

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
export const uniformEdges = (length: number, n: number): number[] =>
  Array.from({ length: n + 1 }, (_, i) => (length * i) / n);

/** Centre of a ring that splits its area in two (the axis cell included). */
const ringCentre = (r0: number, r1: number): number => Math.sqrt((r0 * r0 + r1 * r1) / 2);

export function buildGrid(spec: GridSpec): Grid {
  const { geometry, xEdges, yEdges, material, T } = spec;
  const depth = spec.depth ?? 1;
  const nx = xEdges.length - 1;
  const ny = yEdges.length - 1;
  const id = (i: number, j: number): number => i + nx * j;
  const volume = new Float64Array(nx * ny);
  const xCenter = new Float64Array(nx);
  const yCenter = new Float64Array(ny);
  const dx = (i: number): number => xEdges[i + 1]! - xEdges[i]!;
  const dy = (j: number): number => yEdges[j + 1]! - yEdges[j]!;
  for (let j = 0; j < ny; j++) yCenter[j] = (yEdges[j]! + yEdges[j + 1]!) / 2;
  for (let i = 0; i < nx; i++) {
    xCenter[i] = geometry === 'rz' ? ringCentre(xEdges[i]!, xEdges[i + 1]!) : (xEdges[i]! + xEdges[i + 1]!) / 2;
  }
  /** Plan area of column i: the ring of a cylinder, a strip of a plane. */
  const planArea = (i: number): number =>
    geometry === 'rz' ? Math.PI * (xEdges[i + 1]! ** 2 - xEdges[i]! ** 2) : dx(i) * depth;
  /** Shape factor of the half-cell from the centre of column i to its face at x = edge, for a cell of height dyj. */
  const xHalf = (i: number, edge: number, dyj: number): number => {
    if (geometry === 'xy') return (dyj * depth) / Math.abs(edge - xCenter[i]!);
    return (2 * Math.PI * dyj) / Math.abs(Math.log(edge / xCenter[i]!));
  };
  /** Area of the face between columns or of the side, at x = edge. */
  const xFace = (edge: number, dyj: number): number => (geometry === 'rz' ? 2 * Math.PI * edge * dyj : dyj * depth);

  const nodes: NodeSpec[] = [];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const v = planArea(i) * dy(j);
      volume[id(i, j)] = v;
      nodes.push({ T, mass: v * material.rho, material });
    }
  }
  const links: LinkSpec[] = [];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      if (i + 1 < nx) {
        const edge = xEdges[i + 1]!;
        links.push({ a: id(i, j), b: id(i + 1, j), shapeA: xHalf(i, edge, dy(j)), shapeB: xHalf(i + 1, edge, dy(j)) });
      }
      if (j + 1 < ny) {
        const area = planArea(i);
        links.push({ a: id(i, j), b: id(i, j + 1), shapeA: area / (dy(j) / 2), shapeB: area / (dy(j + 1) / 2) });
      }
    }
  }
  const faces = (side: GridSide): GridFace[] => {
    const out: GridFace[] = [];
    if (side === 'xMax' || side === 'xMin') {
      const i = side === 'xMax' ? nx - 1 : 0;
      const edge = side === 'xMax' ? xEdges[nx]! : xEdges[0]!;
      if (geometry === 'rz' && edge === 0) return out;
      for (let j = 0; j < ny; j++) out.push({ node: id(i, j), area: xFace(edge, dy(j)), shape: xHalf(i, edge, dy(j)) });
    } else {
      const j = side === 'yMax' ? ny - 1 : 0;
      for (let i = 0; i < nx; i++) {
        const area = planArea(i);
        out.push({ node: id(i, j), area, shape: area / (dy(j) / 2) });
      }
    }
    return out;
  };
  return { nx, ny, nodes, links, id, volume, faces, xCenter, yCenter };
}
