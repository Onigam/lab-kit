// Materials of the thermal core: a density, a specific heat that may depend on temperature, its enthalpy (so that energy is
// conserved while c changes), and a conductivity. Temperatures are in °C everywhere in this folder, enthalpies in J/kg above 0 °C.
// No import from a lab: the kit's thermal core, used by several.
/** A curve given by points, straight between them and straight beyond the two ends (slope of the last segment). */
export function piecewise(points) {
    const n = points.length;
    if (n === 1)
        return () => points[0][1];
    return (x) => {
        let i = 0;
        while (i < n - 2 && x > points[i + 1][0])
            i++;
        const [x0, y0] = points[i];
        const [x1, y1] = points[i + 1];
        return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    };
}
/**
 * A material from any c(T): the enthalpy is tabulated once, then read by straight interpolation both ways, so that
 * `Tof(h(T)) === T` to rounding, whatever the curve. A lookup costs a dozen comparisons at most.
 */
export function makeMaterial(spec) {
    const Tmin = spec.Tmin ?? -60;
    const Tmax = spec.Tmax ?? 1200;
    const dT = spec.dT ?? 4;
    const n = Math.round((Tmax - Tmin) / dT) + 1;
    const table = new Float64Array(n);
    // integrate from 0 °C outwards with Simpson's rule on each step
    const stepH = (a, b) => ((b - a) / 6) * (spec.c(a) + 4 * spec.c((a + b) / 2) + spec.c(b));
    let zero = 0;
    for (let T = Tmin; T < 0; T += dT)
        zero += stepH(T, Math.min(T + dT, 0));
    table[0] = -zero;
    for (let i = 1; i < n; i++)
        table[i] = table[i - 1] + stepH(Tmin + (i - 1) * dT, Tmin + i * dT);
    const cLow = spec.c(Tmin);
    const cHigh = spec.c(Tmax);
    const h = (T) => {
        if (T <= Tmin)
            return table[0] + (T - Tmin) * cLow;
        if (T >= Tmax)
            return table[n - 1] + (T - Tmax) * cHigh;
        const x = (T - Tmin) / dT;
        const i = Math.min(Math.floor(x), n - 2);
        return table[i] + (x - i) * (table[i + 1] - table[i]);
    };
    const Tof = (e) => {
        if (e <= table[0])
            return Tmin + (e - table[0]) / cLow;
        if (e >= table[n - 1])
            return Tmax + (e - table[n - 1]) / cHigh;
        let lo = 0;
        let hi = n - 1;
        while (hi - lo > 1) {
            const mid = (lo + hi) >> 1;
            if (table[mid] <= e)
                lo = mid;
            else
                hi = mid;
        }
        return Tmin + (lo + (e - table[lo]) / (table[lo + 1] - table[lo])) * dT;
    };
    return { name: spec.name, rho: spec.rho, c: spec.c, k: spec.k, h, Tof };
}
/** A material with constant properties: h and T are one multiplication apart. */
export function constantMaterial(name, rho, c, k) {
    return { name, rho, c: () => c, k: () => k, h: (T) => c * T, Tof: (e) => e / c };
}
// ------------------------------------------------------------------------------------------------ the table
/**
 * Specific heat of a quartz sand, measured, J/kg·K: Juul (KTH, 2023) from 60 to 500 °C; the 600 °C point is another measured sand,
 * Baumann & Zunft (DLR, 2015), which gives 1,187 there. Below 60 °C the first slope carries on, which gives 725 at 20 °C (pure quartz: 732).
 */
export const QUARTZ_SAND_C = [
    [60, 776],
    [100, 827],
    [200, 936],
    [300, 1009],
    [400, 1072],
    [500, 1133],
    [600, 1187],
];
/** Conductivity of the same sand as a bed, W/m·K, measured (Juul 2023): it rises with temperature through radiation between grains. */
export const QUARTZ_SAND_K = [
    [25, 0.218],
    [500, 0.451],
];
/**
 * Specific heat of pure quartz, J/kg·K, T in °C: the fit to the NIST-JANAF table published by Hinkelman, Milner & Zuo (2023), up to the
 * 573 °C inversion, then their second branch.
 */
export function quartzNistC(T) {
    const K = T + 273.15;
    return K <= 846.15
        ? 2.79914e-6 * K * K * K - 5.394235e-3 * K * K + 4.181354 * K - 99.29403
        : 0.1671556 * K + 980.4303;
}
/** Quartz sand as a bed. `rho` defaults to the measured bulk density (Juul 2023). `kScale` multiplies the measured conductivity. */
export function quartzSand(rho = 1425, kScale = 1) {
    const c = piecewise(QUARTZ_SAND_C);
    const k = piecewise(QUARTZ_SAND_K);
    return makeMaterial({ name: 'quartz-sand', rho, c, k: (T) => kScale * k(T) });
}
/** Pure quartz by the NIST fit, same bed conductivity: the second curve for a sand, to see how much the choice of curve weighs. */
export function quartzPure(rho = 1425, kScale = 1) {
    const k = piecewise(QUARTZ_SAND_K);
    return makeMaterial({ name: 'quartz-pure', rho, c: quartzNistC, k: (T) => kScale * k(T) });
}
/**
 * Crushed soapstone as a bed. c = 1,000 J/kg·K: an unreferenced value from a heater maker (0.98 to 1.0), its change with temperature
 * is unknown. k = 0.7 W/m·K: an estimate (0.5 to 1.0), no measurement of a bed found.
 */
export function crushedSoapstone(rho = 2165, kBed = 0.7, c = 1000) {
    return constantMaterial('crushed-soapstone', rho, c, kBed);
}
/** Liquid water, usual values. Latent heat is not modelled: this is for a tank or a circuit below boiling. */
export function liquidWater() {
    return constantMaterial('water', 1000, 4186, 0.6);
}
