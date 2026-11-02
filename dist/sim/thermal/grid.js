/** `n + 1` evenly spaced edges from 0 to `length`. */
export const uniformEdges = (length, n) => Array.from({ length: n + 1 }, (_, i) => (length * i) / n);
/** Centre of a ring that splits its area in two (the axis cell included). */
const ringCentre = (r0, r1) => Math.sqrt((r0 * r0 + r1 * r1) / 2);
export function buildGrid(spec) {
    const { geometry, xEdges, yEdges, material, T } = spec;
    const depth = spec.depth ?? 1;
    const nx = xEdges.length - 1;
    const ny = yEdges.length - 1;
    const id = (i, j) => i + nx * j;
    const volume = new Float64Array(nx * ny);
    const xCenter = new Float64Array(nx);
    const yCenter = new Float64Array(ny);
    const dx = (i) => xEdges[i + 1] - xEdges[i];
    const dy = (j) => yEdges[j + 1] - yEdges[j];
    for (let j = 0; j < ny; j++)
        yCenter[j] = (yEdges[j] + yEdges[j + 1]) / 2;
    for (let i = 0; i < nx; i++) {
        xCenter[i] = geometry === 'rz' ? ringCentre(xEdges[i], xEdges[i + 1]) : (xEdges[i] + xEdges[i + 1]) / 2;
    }
    /** Plan area of column i: the ring of a cylinder, a strip of a plane. */
    const planArea = (i) => geometry === 'rz' ? Math.PI * (xEdges[i + 1] ** 2 - xEdges[i] ** 2) : dx(i) * depth;
    /** Shape factor of the half-cell from the centre of column i to its face at x = edge, for a cell of height dyj. */
    const xHalf = (i, edge, dyj) => {
        if (geometry === 'xy')
            return (dyj * depth) / Math.abs(edge - xCenter[i]);
        return (2 * Math.PI * dyj) / Math.abs(Math.log(edge / xCenter[i]));
    };
    /** Area of the face between columns or of the side, at x = edge. */
    const xFace = (edge, dyj) => (geometry === 'rz' ? 2 * Math.PI * edge * dyj : dyj * depth);
    const nodes = [];
    for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
            const v = planArea(i) * dy(j);
            volume[id(i, j)] = v;
            nodes.push({ T, mass: v * material.rho, material });
        }
    }
    const links = [];
    for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
            if (i + 1 < nx) {
                const edge = xEdges[i + 1];
                links.push({ a: id(i, j), b: id(i + 1, j), shapeA: xHalf(i, edge, dy(j)), shapeB: xHalf(i + 1, edge, dy(j)) });
            }
            if (j + 1 < ny) {
                const area = planArea(i);
                links.push({ a: id(i, j), b: id(i, j + 1), shapeA: area / (dy(j) / 2), shapeB: area / (dy(j + 1) / 2) });
            }
        }
    }
    const faces = (side) => {
        const out = [];
        if (side === 'xMax' || side === 'xMin') {
            const i = side === 'xMax' ? nx - 1 : 0;
            const edge = side === 'xMax' ? xEdges[nx] : xEdges[0];
            if (geometry === 'rz' && edge === 0)
                return out;
            for (let j = 0; j < ny; j++)
                out.push({ node: id(i, j), area: xFace(edge, dy(j)), shape: xHalf(i, edge, dy(j)) });
        }
        else {
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
