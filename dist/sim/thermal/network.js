export function createNetwork(nodes, links) {
    const n = nodes.length;
    const m = links.length;
    const net = {
        n,
        mass: new Float64Array(n),
        material: new Array(n).fill(null),
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
        if (s.fixed)
            net.fixed[i] = 1;
        else if (s.material) {
            net.material[i] = s.material;
            net.mass[i] = s.mass ?? 0;
        }
        else
            net.capacity[i] = s.capacity ?? 0;
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
export function setNodeTemperature(net, i, T) {
    net.T[i] = T;
    if (net.fixed[i])
        return;
    const mat = net.material[i];
    net.H[i] = mat ? net.mass[i] * mat.h(T) : net.capacity[i] * T;
}
/** Change the fixed conductance of a link without rebuilding the network, W/K. */
export function setLinkConductance(net, link, G) {
    net.linkR[link] = G > 0 ? 1 / G : Number.POSITIVE_INFINITY;
}
/** Read every conductance at the present temperatures. */
export function updateConductances(net) {
    const { linkA, linkB, linkR, shapeA, shapeB, linkG, material, T } = net;
    for (let l = 0; l < linkG.length; l++) {
        let R = linkR[l];
        const a = linkA[l];
        const b = linkB[l];
        const sa = shapeA[l];
        const sb = shapeB[l];
        if (sa > 0)
            R += 1 / (material[a].k(T[a]) * sa);
        if (sb > 0)
            R += 1 / (material[b].k(T[b]) * sb);
        linkG[l] = R > 0 ? 1 / R : 0;
    }
}
/** Heat capacity of a node at its present temperature, J/K. */
export function nodeCapacity(net, i) {
    const mat = net.material[i];
    return mat ? net.mass[i] * mat.c(net.T[i]) : net.capacity[i];
}
/** The longest explicit step that stays stable at the present temperatures, s. */
export function stableStep(net) {
    const { n, sumG, linkA, linkB, linkG, fixed } = net;
    sumG.fill(0);
    for (let l = 0; l < linkG.length; l++) {
        sumG[linkA[l]] += linkG[l];
        sumG[linkB[l]] += linkG[l];
    }
    let dt = Number.POSITIVE_INFINITY;
    for (let i = 0; i < n; i++) {
        if (fixed[i] || sumG[i] <= 0)
            continue;
        const limit = nodeCapacity(net, i) / sumG[i];
        if (limit < dt)
            dt = limit;
    }
    // an explicit step is stable below C / ΣG on a one-dimensional chain and on any network whose node sums are read this way: keep a margin
    return 0.5 * dt;
}
/**
 * Move heat for `dt` seconds along the links and from `net.Q`, in as many equal substeps as stability asks. Energy is conserved to
 * rounding whatever the conductances do: each link takes from one node what it gives to the other. Returns the number of substeps.
 */
export function stepNetwork(net, dt) {
    updateConductances(net);
    const steps = Math.max(1, Math.ceil(dt / stableStep(net)));
    const h = dt / steps;
    const { n, T, H, Q, flow, fixed, mass, capacity, material, boundaryEnergy, linkA, linkB, linkG } = net;
    const links = linkG.length;
    for (let s = 0; s < steps; s++) {
        flow.fill(0);
        for (let l = 0; l < links; l++) {
            const a = linkA[l];
            const b = linkB[l];
            const q = linkG[l] * (T[a] - T[b]);
            flow[a] -= q;
            flow[b] += q;
        }
        for (let i = 0; i < n; i++) {
            const q = flow[i] + Q[i];
            if (fixed[i]) {
                boundaryEnergy[i] += q * h;
                continue;
            }
            if (q === 0)
                continue;
            H[i] += q * h;
            const mat = material[i];
            T[i] = mat ? mat.Tof(H[i] / mass[i]) : H[i] / capacity[i];
        }
    }
    return steps;
}
/** The sum of the enthalpies of the nodes that are not fixed, J. */
export function totalEnthalpy(net) {
    let e = 0;
    for (let i = 0; i < net.n; i++)
        e += net.H[i];
    return e;
}
/** The sum of the energy received by all the fixed nodes, J. */
export function totalBoundaryEnergy(net) {
    let e = 0;
    for (let i = 0; i < net.n; i++)
        e += net.boundaryEnergy[i];
    return e;
}
