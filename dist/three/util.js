import * as THREE from 'three';
/** Create a mesh that casts/receives shadows, optionally positioned/rotated. */
export function mesh(geometry, material, pos, rot) {
    const m = new THREE.Mesh(geometry, material);
    m.castShadow = true;
    m.receiveShadow = true;
    if (pos)
        m.position.set(...pos);
    if (rot)
        m.rotation.set(...rot);
    return m;
}
/** Named group helper. */
export function group(name, pos) {
    const g = new THREE.Group();
    g.name = name;
    if (pos)
        g.position.set(...pos);
    return g;
}
/** Deterministic PRNG (mulberry32) so procedural scenes are identical on every load. */
export function rng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
/** Canvas-backed texture; call `redraw()` on the returned handle to update it. */
export function canvasTexture(width, height, draw) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    let current = draw;
    const redraw = (fn) => {
        if (fn)
            current = fn;
        ctx.clearRect(0, 0, width, height);
        current(ctx, width, height);
        texture.needsUpdate = true;
    };
    redraw();
    return { texture, redraw };
}
/** Hex socket-head / hex bolt head pointing along +Y, base at y=0. */
export function boltHead(radius, height, material) {
    const m = mesh(new THREE.CylinderGeometry(radius, radius, height, 6), material);
    m.position.y = height / 2;
    return m;
}
/** Tube following a polyline with rounded corners (pipes, cables). */
export function pipeAlong(points, radius, material, opts = {}) {
    const path = roundedPath(points, opts.bend ?? radius * 3);
    const geo = new THREE.TubeGeometry(path, opts.tubularSegments ?? Math.max(16, Math.round(path.getLength() / (radius * 1.5))), radius, opts.radialSegments ?? 16, false);
    return mesh(geo, material);
}
/** Polyline -> CurvePath with circular-ish fillets of radius `bend` at each corner. */
export function roundedPath(points, bend) {
    const path = new THREE.CurvePath();
    if (points.length < 3) {
        path.add(new THREE.LineCurve3(points[0], points[points.length - 1]));
        return path;
    }
    let start = points[0].clone();
    for (let i = 1; i < points.length - 1; i++) {
        const prev = points[i - 1];
        const cur = points[i];
        const next = points[i + 1];
        const dIn = cur.clone().sub(prev);
        const dOut = next.clone().sub(cur);
        const r = Math.min(bend, dIn.length() / 2, dOut.length() / 2);
        const a = cur.clone().addScaledVector(dIn.normalize(), -r);
        const b = cur.clone().addScaledVector(dOut.normalize(), r);
        if (a.distanceTo(start) > 1e-6)
            path.add(new THREE.LineCurve3(start, a));
        path.add(new THREE.QuadraticBezierCurve3(a, cur.clone(), b));
        start = b;
    }
    path.add(new THREE.LineCurve3(start, points[points.length - 1].clone()));
    return path;
}
/** Ease helpers for animations. */
export const ease = {
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    out: (t) => 1 - Math.pow(1 - t, 3),
};
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
/** Exponential smoothing factor independent of frame rate. */
export function damp(current, target, lambda, dt) {
    return lerp(current, target, 1 - Math.exp(-lambda * dt));
}
