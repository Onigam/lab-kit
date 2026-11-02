import { describe, expect, it } from 'vitest';
import {
  enclosedEmissivity,
  FILM_FACING_UP,
  FILM_VERTICAL,
  heatRampGlsl,
  heatRgb,
  heatStops,
  linearRgb,
  naturalFilm,
  radiationConductance,
  RAMP_COLOURS,
  RE_LAMINAR,
  SIGMA,
  solveLoopFlow,
  stackDraft,
  tubeFriction,
  tubeNusselt,
  velocityHead,
  airCp,
  airK,
  airMu,
  airPr,
  airRho,
  buildGrid,
  buoyancyMix,
  constantMaterial,
  createNetwork,
  crushedSoapstone,
  effectiveness,
  flowHeat,
  fluidLine,
  liquidWater,
  makeMaterial,
  marchFluid,
  piecewise,
  pipeCellConductance,
  pipeCellFactor,
  pipeCellShape,
  pipeCellTime,
  pitchRadius,
  quartzNistC,
  quartzSand,
  seriesU,
  setNodeTemperature,
  stableStep,
  stepNetwork,
  surfaceLoss,
  totalBoundaryEnergy,
  totalEnthalpy,
  tubeFlow,
  tubePressureDrop,
  uniformEdges,
  type LinkSpec,
  type NodeSpec,
} from './index';

// The core on its own, checked against closed-form results, with no figure from any lab: a lab's figures are in its own src/sim/figures.test.ts.

describe('this folder stays pure, as it moved to the kit', () => {
  const sources = import.meta.glob(['./*.ts', '!./*.test.ts'], {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;
  it('imports nothing from outside itself', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(4);
    for (const [file, text] of Object.entries(sources)) {
      for (const m of text.matchAll(/from '([^']+)'/g)) expect(m[1], file).toMatch(/^\.\/[a-z]+$/);
    }
  });
  it('has no name from a lab, no DOM, no three.js', () => {
    for (const [file, text] of Object.entries(sources)) {
      expect(text, file).not.toMatch(
        /silo|pornainen|kankaanp|vaaksy|vääksy|polar night|bench|drum|j-tube|rocket|mass heater|\bdocument\b|\bwindow\b/i,
      );
      expect(text, file).not.toMatch(/\bTHREE\./);
    }
  });
});

describe('materials', () => {
  const curved = makeMaterial({ name: 'curved', rho: 1000, c: (T) => 800 + T, k: () => 1 });

  it('the enthalpy is the integral of c, the inverse is exact', () => {
    // c = 800 + T: h(T) = 800 T + T²/2
    for (const T of [-40, 0, 37, 200, 555, 1100]) {
      // straight between the 4 K nodes of the table: at most c'·dT²/8 = 2 J/kg off, on tens of kJ/kg
      expect(Math.abs(curved.h(T) - (800 * T + (T * T) / 2))).toBeLessThanOrEqual(2.01);
      expect(curved.Tof(curved.h(T))).toBeCloseTo(T, 9);
    }
    expect(curved.h(0)).toBeCloseTo(0, 6);
  });
  it('carries on past both ends of the table, still invertible', () => {
    for (const T of [-200, 1500]) expect(curved.Tof(curved.h(T))).toBeCloseTo(T, 6);
  });
  it('a piecewise curve is straight between its points and beyond them', () => {
    const f = piecewise([
      [0, 0],
      [10, 10],
      [20, 30],
    ]);
    expect(f(5)).toBeCloseTo(5);
    expect(f(15)).toBeCloseTo(20);
    expect(f(-5)).toBeCloseTo(-5);
    expect(f(25)).toBeCloseTo(40);
  });
  it('a constant material needs no table', () => {
    const m = constantMaterial('m', 1, 2000, 1);
    expect(m.h(100)).toBe(200000);
    expect(m.Tof(200000)).toBe(100);
  });
  it('the shipped materials read back their own temperatures', () => {
    for (const m of [quartzSand(), crushedSoapstone(), liquidWater()]) {
      for (const T of [5, 90, 480]) expect(m.Tof(m.h(T))).toBeCloseTo(T, 8);
    }
    expect(quartzSand(1500, 2).k(25)).toBeCloseTo(0.436, 6);
    expect(quartzNistC(25)).toBeCloseTo(741.8, 0);
  });
});

describe('air', () => {
  it('has the values of the usual tables', () => {
    expect(airRho(20)).toBeCloseTo(1.204, 2);
    expect(airRho(300)).toBeCloseTo(0.616, 2);
    expect(Math.abs(airCp(20) / 1005 - 1)).toBeLessThan(0.01);
    expect(Math.abs(airCp(500) / 1093 - 1)).toBeLessThan(0.01);
    expect(airMu(20)).toBeCloseTo(1.82e-5, 6);
    expect(airK(20)).toBeCloseTo(0.0257, 3);
    expect(airPr(20)).toBeCloseTo(0.71, 1);
  });
});

describe('the RC network', () => {
  it('two nodes relax with the exact exponential', () => {
    const net = createNetwork(
      [
        { T: 100, capacity: 1000 },
        { T: 0, capacity: 1000 },
      ],
      [{ a: 0, b: 1, G: 1 }],
    );
    for (let i = 0; i < 2000; i++) stepNetwork(net, 0.25);
    // the difference falls as exp(−2 G t / C) over 500 s: a time constant of 500 s
    expect(net.T[0]! - net.T[1]!).toBeCloseTo(100 * Math.exp(-1), 0);
    expect(net.T[0]! + net.T[1]!).toBeCloseTo(100, 8);
  });
  it('takes substeps when the step asked for would be unstable', () => {
    const net = createNetwork(
      [
        { T: 100, capacity: 10 },
        { T: 0, capacity: 10 },
      ],
      [{ a: 0, b: 1, G: 5 }],
    );
    expect(stableStep(net)).toBeLessThanOrEqual(1);
    expect(stepNetwork(net, 100)).toBeGreaterThan(50);
    expect(net.T[0]).toBeCloseTo(50, 6);
    expect(net.T[1]).toBeCloseTo(50, 6);
  });
  it('a fixed node counts what it received and the balance closes, with c and k changing with temperature', () => {
    const m = makeMaterial({ name: 'm', rho: 1000, c: (T) => 800 + T, k: (T) => 0.2 + 0.001 * T });
    const nodes: NodeSpec[] = [
      { T: 500, mass: 10, material: m },
      { T: 100, mass: 20, material: m },
      { T: 10, fixed: true },
    ];
    const links: LinkSpec[] = [
      { a: 0, b: 1, shapeA: 0.2, shapeB: 0.2 },
      { a: 1, b: 2, G: 0.1, shapeA: 0.1 },
    ];
    const net = createNetwork(nodes, links);
    const e0 = totalEnthalpy(net);
    net.Q[0] = 50;
    for (let i = 0; i < 500; i++) stepNetwork(net, 60);
    const added = 50 * 500 * 60;
    expect((totalEnthalpy(net) + totalBoundaryEnergy(net) - e0 - added) / (e0 + added)).toBeCloseTo(0, 10);
    expect(totalBoundaryEnergy(net)).toBeGreaterThan(0);
  });
  it('a node can be set again, enthalpy included', () => {
    const net = createNetwork([{ T: 0, mass: 1, material: crushedSoapstone() }], []);
    setNodeTemperature(net, 0, 100);
    expect(net.H[0]).toBeCloseTo(100000, 6);
  });
});

describe('grids against closed-form conduction', () => {
  it('a slab with one face held: the far face follows the series solution', () => {
    // L = 1 m, face at 1, the rest at 0, the far face insulated: θ(far) = 1 − (4/π) Σ (−1)^n/(2n+1) exp(−(2n+1)² π² Fo/4)
    const m = constantMaterial('m', 1000, 1000, 1);
    const n = 40;
    const grid = buildGrid({ geometry: 'xy', xEdges: uniformEdges(1, n), yEdges: [0, 1], material: m, T: 0 });
    const held = grid.nodes.length;
    const face = grid.faces('xMin')[0]!;
    const net = createNetwork(
      [...grid.nodes, { T: 1, fixed: true }],
      [...grid.links, { a: face.node, b: held, shapeA: face.shape }],
    );
    const alpha = 1 / (1000 * 1000);
    const Fo = 0.3;
    const total = Fo / alpha;
    const steps = 2000;
    for (let i = 0; i < steps; i++) stepNetwork(net, total / steps);
    let series = 0;
    for (let k = 0; k < 40; k++) {
      series += (((k % 2 ? -1 : 1) / (2 * k + 1)) * Math.exp(-((2 * k + 1) ** 2) * Math.PI ** 2 * Fo * 0.25)) as number;
    }
    expect(net.T[grid.id(n - 1, 0)]!).toBeCloseTo(1 - (4 / Math.PI) * series, 2);
  });

  it('a cylinder with its side held: the first decay mode has the rate 5.783 α/R²', () => {
    const m = constantMaterial('m', 1000, 1000, 1);
    const R = 1;
    const grid = buildGrid({ geometry: 'rz', xEdges: uniformEdges(R, 10), yEdges: [0, 1], material: m, T: 1 });
    const edge = grid.nodes.length;
    const face = grid.faces('xMax')[0]!;
    const net = createNetwork(
      [...grid.nodes, { T: 0, fixed: true }],
      [...grid.links, { a: face.node, b: edge, shapeA: face.shape }],
    );
    const alpha = 1e-6;
    const tau = (R * R) / (5.783 * alpha);
    const dt = tau / 400;
    for (let i = 0; i < 400; i++) stepNetwork(net, dt); // one time constant, higher modes gone
    const t1 = net.T[0]!;
    for (let i = 0; i < 400; i++) stepNetwork(net, dt);
    expect(net.T[0]! / t1).toBeCloseTo(Math.exp(-1), 1);
    expect(Math.abs(net.T[0]! / t1 - Math.exp(-1))).toBeLessThan(0.015);
  });

  it('rings add up to the cylinder, and a cell of the grid has the right mass', () => {
    const m = crushedSoapstone(2000);
    const grid = buildGrid({
      geometry: 'rz',
      xEdges: uniformEdges(3, 6),
      yEdges: uniformEdges(4, 4),
      material: m,
      T: 20,
    });
    const v = grid.volume.reduce((a, b) => a + b, 0);
    expect(v).toBeCloseTo(Math.PI * 9 * 4, 8);
    const mass = grid.nodes.reduce((a, b) => a + b.mass!, 0);
    expect(mass).toBeCloseTo(2000 * v, 6);
    const side = grid.faces('xMax').reduce((a, f) => a + f.area, 0);
    expect(side).toBeCloseTo(2 * Math.PI * 3 * 4, 8);
    const top = grid.faces('yMax').reduce((a, f) => a + f.area, 0);
    expect(top).toBeCloseTo(Math.PI * 9, 8);
    expect(grid.faces('xMin')).toHaveLength(0); // the axis is no boundary
  });

  it('heat stays in a closed body: the grid conserves energy to rounding with k and c changing', () => {
    const m = quartzSand();
    const grid = buildGrid({
      geometry: 'rz',
      xEdges: uniformEdges(2, 8),
      yEdges: uniformEdges(3, 5),
      material: m,
      T: 100,
    });
    const net = createNetwork(grid.nodes, grid.links);
    setNodeTemperature(net, grid.id(0, 2), 550);
    const e0 = totalEnthalpy(net);
    for (let i = 0; i < 200; i++) stepNetwork(net, 3600);
    expect((totalEnthalpy(net) - e0) / e0).toBeCloseTo(0, 10);
  });
});

describe('what passes heat', () => {
  it('layers in series', () => {
    expect(seriesU([{ thickness: 0.5, lambda: 0.1 }])).toBeCloseTo(0.2, 10);
    expect(seriesU([{ thickness: 0.45, lambda: 0.1 }], Infinity, 10)).toBeCloseTo(1 / 4.6, 10);
    expect(surfaceLoss(0.2, 100, 110, 10)).toBeCloseTo(2000, 8);
    expect(flowHeat(2, 1000, 10)).toBeCloseTo(20000, 8);
  });
  it('effectiveness: the textbook values', () => {
    expect(effectiveness(1000, 1000, 1000)).toBeCloseTo(0.5, 8); // counterflow, Cr = 1, NTU = 1
    expect(effectiveness(1000, 1000, 1e12)).toBeCloseTo(1 - Math.exp(-1), 8); // one side condensing
    expect(effectiveness(1000, 1000, 2000)).toBeCloseTo(0.5647, 3); // counterflow, Cr = 0.5
    expect(effectiveness(1000, 1000, 2000, 'parallel')).toBeCloseTo((1 - Math.exp(-1.5)) / 1.5, 8);
    expect(effectiveness(1000, 1000, 2000, 'cross')).toBeGreaterThan(0.5179);
    expect(effectiveness(1000, 1000, 2000, 'cross')).toBeLessThan(0.5647);
    expect(effectiveness(0, 1000, 2000)).toBe(0);
  });
  it('a fluid through a mass: outlet by the exponential, heat by the balance, and linear in the inlet', () => {
    const T = new Float64Array([100, 200]);
    const order = [0, 1];
    const G = [1000, 500];
    const C = 1000;
    const q = new Float64Array(2);
    const Tin = 20;
    const out = marchFluid(Tin, order, T, G, C, q);
    const t1 = 100 + (20 - 100) * Math.exp(-1);
    const t2 = 200 + (t1 - 200) * Math.exp(-0.5);
    expect(out).toBeCloseTo(t2, 10);
    expect(q[0]! + q[1]!).toBeCloseTo(C * (Tin - out), 8);
    const line = { A: 0, B: 0 };
    fluidLine(order, T, G, C, line);
    expect(line.A + line.B * Tin).toBeCloseTo(out, 10);
  });
  it('a pipe in its cell: the conductance and the fine profile agree with a fine radial grid at steady heating', () => {
    // the quasi-steady regime: an annulus of radii r0 and R, uniformly heated, its wall held
    const k = 0.7;
    const R = 0.28;
    const r0 = 0.05;
    expect(pitchRadius(0.5)).toBeCloseTo(0.2821, 3);
    const G = pipeCellConductance(k, 1, R, r0);
    // the simple form ln(R/r) − 3/4 is the limit for a thin pipe: 10 % off at this ratio, 1 % at R/r = 20
    expect(pipeCellFactor(R, r0) / (Math.log(5.6) - 0.75)).toBeCloseTo(1.1, 1);
    expect(pipeCellFactor(1, 0.05) / (Math.log(20) - 0.75)).toBeCloseTo(1, 1);
    // numerically: rings from r0 to R, wall held, a uniform source: steady profile by marching the flux outwards to inwards
    const n = 4000;
    const dr = (R - r0) / n;
    const q = 1000; // W/m of pipe, delivered uniformly per unit of area
    let T = 0;
    let energy = 0;
    let area = 0;
    for (let i = 0; i < n; i++) {
      const r = r0 + (i + 0.5) * dr;
      // what crosses radius r towards the wall is the source beyond r
      const flux = (q * (R * R - r * r)) / (R * R - r0 * r0);
      T += (flux * dr) / (2 * Math.PI * k * r);
      energy += T * 2 * Math.PI * r * dr;
      area += 2 * Math.PI * r * dr;
    }
    const meanRise = energy / area;
    const closedForm = q / G;
    expect(meanRise / closedForm).toBeCloseTo(1, 3);
    expect(pipeCellShape(r0, R, r0)).toBeCloseTo(0, 8);
    expect(pipeCellShape(R, R, r0)).toBeGreaterThan(1);
    const tau = pipeCellTime(k, 2165 * 1000, R, r0);
    expect(tau / 3600).toBeGreaterThan(20);
    expect(tau / 3600).toBeLessThan(50);
  });
  it('air in a tube: a laminar and a turbulent case', () => {
    const gas = { rho: 0.75, mu: 2.6e-5, k: 0.039, Pr: 0.7 };
    const laminar = tubeFlow(1e-4, 0.1, gas);
    expect(laminar.Re).toBeLessThan(2300);
    expect(laminar.f).toBeCloseTo(64 / laminar.Re, 8);
    const turbulent = tubeFlow(0.07, 0.094, gas);
    expect(turbulent.Re).toBeGreaterThan(3e4);
    // Dittus-Boelter gives about the same film
    const db = (0.023 * turbulent.Re ** 0.8 * gas.Pr ** 0.4 * gas.k) / 0.094;
    expect(turbulent.h / db).toBeGreaterThan(0.85);
    expect(turbulent.h / db).toBeLessThan(1.25);
    expect(tubePressureDrop(turbulent, 48, 0.094, gas.rho)).toBeGreaterThan(0);
  });
});

describe('a fluid column', () => {
  it('a warm layer under a cold one mixes, energy kept', () => {
    const T = [60, 20, 40];
    const w = [1, 1, 2];
    const before = T[0]! * w[0]! + T[1]! * w[1]! + T[2]! * w[2]!;
    expect(buoyancyMix(T, w)).toBeGreaterThan(0);
    for (let i = 1; i < T.length; i++) expect(T[i]!).toBeGreaterThanOrEqual(T[i - 1]! - 1e-12);
    expect(T[0]! * w[0]! + T[1]! * w[1]! + T[2]! * w[2]!).toBeCloseTo(before, 10);
  });
  it('a stable column is left alone', () => {
    const T = [10, 20, 30, 80];
    expect(buoyancyMix(T, [1, 1, 1, 1])).toBe(0);
    expect(T).toEqual([10, 20, 30, 80]);
  });
  it('a deep inversion ends as one block', () => {
    const T = [90, 70, 50, 30];
    buoyancyMix(T, [1, 1, 1, 1]);
    for (const t of T) expect(t).toBeCloseTo(60, 10);
  });
});

describe('a warm column', () => {
  it('pulls when lighter than the air beside it, pushes down when heavier, and is zero at the same temperature', () => {
    // ρ = p/(R·T): 1.2041 at 20 °C, 1.2930 at 0 °C
    expect(airRho(20)).toBeCloseTo(1.2041, 3);
    expect(stackDraft(5, 80, 0)).toBeCloseTo(9.81 * 5 * (airRho(0) - airRho(80)), 10);
    expect(stackDraft(5, 80, 0)).toBeGreaterThan(0);
    expect(stackDraft(5, -5, 20)).toBeLessThan(0);
    expect(stackDraft(3, 15, 15)).toBe(0);
  });
  it('a velocity head', () => {
    expect(velocityHead(0.012, 0.03, 1.2)).toBeCloseTo(0.5 * 1.2 * (1 / 3) ** 2, 8);
  });
  it('friction and Nusselt number are those of tubeFlow, and the transition is a jump, as written', () => {
    const gas = { rho: 0.75, mu: 2.6e-5, k: 0.039, Pr: 0.7 };
    for (const m of [1e-4, 0.003, 0.0075, 0.012, 0.07]) {
      const fl = tubeFlow(m, 0.2, gas);
      expect(tubeFriction(fl.Re)).toBeCloseTo(fl.f, 12);
      expect((tubeNusselt(fl.Re, fl.f, gas.Pr) * gas.k) / 0.2).toBeCloseTo(fl.h, 12);
    }
    expect(tubeFriction(RE_LAMINAR + 1)).toBeGreaterThan(tubeFriction(RE_LAMINAR - 1));
    const Nu = (Re: number) => tubeNusselt(Re, tubeFriction(Re), 0.7);
    expect(Nu(RE_LAMINAR - 1)).toBe(3.66);
    expect(Nu(RE_LAMINAR + 1)).toBeGreaterThan(6);
  });
});

describe('a loop driven by its own weight', () => {
  // a loop with a drive that grows with the flow near zero and a square-law friction: two stable answers, one each way
  const twoWays = (m: number): number => (m >= 0 ? 4 - 0.5 * m * m : -4 + 0.5 * m * m);
  it('finds the flow of a plain loop, from anywhere', () => {
    const plain = (m: number) => 8 - 2 * m * Math.abs(m);
    for (const from of [0, 1, -3, 10]) expect(solveLoopFlow(plain, from, 20, 1e-7)).toBeCloseTo(2, 4);
  });
  it('stays on the branch it is on', () => {
    expect(solveLoopFlow(twoWays, 0.5, 20, 1e-7)).toBeCloseTo(Math.sqrt(8), 4);
    expect(solveLoopFlow(twoWays, -0.5, 20, 1e-7)).toBeCloseTo(-Math.sqrt(8), 4);
  });
  it('turns round when its branch stops existing', () => {
    const cold = (m: number) => -3 - m * Math.abs(m);
    expect(solveLoopFlow(cold, 2, 20, 1e-7)).toBeCloseTo(-Math.sqrt(3), 3);
  });
  it('comes to rest when each side pushes back', () => {
    const pinned = (m: number) => (m >= 0 ? -1 - m : 1 - m);
    expect(Math.abs(solveLoopFlow(pinned, 1, 20, 1e-6))).toBeLessThan(1e-4);
  });
  it('stops at its limit when nothing holds it', () => {
    expect(solveLoopFlow(() => 5, 0, 3)).toBe(3);
  });
  it('asks for few evaluations', () => {
    let n = 0;
    const counted = (m: number) => {
      n++;
      return 8 - 2 * m * Math.abs(m);
    };
    solveLoopFlow(counted, 1.9, 20, 1e-4);
    expect(n).toBeLessThan(12);
  });
});

describe('radiation and still air', () => {
  it('the conductance gives the law of the fourth power exactly', () => {
    const G = radiationConductance(0.85, 1.89, 200, 20);
    const direct = 0.85 * SIGMA * 1.89 * (473.15 ** 4 - 293.15 ** 4);
    expect(G * (200 - 20)).toBeCloseTo(direct, 6);
  });
  it('a small body in a large room keeps its own emissivity', () => {
    expect(enclosedEmissivity(0.85, 1, 0.9, 1e6)).toBeCloseTo(0.85, 4);
    expect(enclosedEmissivity(0.8, 1, 0.8, 1)).toBeCloseTo(1 / (1 / 0.8 + 0.25), 10);
  });
  it('a film grows with the cube root of the difference', () => {
    expect(naturalFilm(27)).toBeCloseTo(3 * FILM_VERTICAL, 10);
    expect(naturalFilm(-27, FILM_FACING_UP)).toBeCloseTo(3 * FILM_FACING_UP, 10);
  });
});

describe('the false colour', () => {
  const luma = (c: [number, number, number]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const dist = (a: number[], b: number[]) => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);
  it('stops span what they are asked to, with the same colours at any span', () => {
    const low = heatStops(15, 65);
    expect(low[0]![0]).toBe(15);
    expect(low[low.length - 1]![0]).toBe(65);
    expect(low.map((s) => s[1])).toEqual([...RAMP_COLOURS]);
    expect(heatStops(0, 600)[1]![0]).toBeCloseTo(100, 8);
  });
  it('is held at both ends, and reads a stop exactly', () => {
    const low = heatStops(15, 65);
    expect(heatRgb(low, -40)).toEqual(linearRgb(RAMP_COLOURS[0]!));
    expect(heatRgb(low, 900)).toEqual(linearRgb(RAMP_COLOURS[RAMP_COLOURS.length - 1]!));
    const third = heatRgb(low, low[3]![0]);
    const target = linearRgb(low[3]![1]);
    for (let i = 0; i < 3; i++) expect(third[i]!).toBeCloseTo(target[i]!, 8);
  });
  it('a degree shows anywhere on a narrow span: no two steps of 2 K share a colour', () => {
    const low = heatStops(15, 65);
    for (let T = 15; T < 65; T += 2) {
      const d = dist(heatRgb(low, T), heatRgb(low, T + 2));
      expect(d, `${T} °C`).toBeGreaterThan(0.015);
    }
  });
  it('a body between 20 and 60 °C is one shade on a span of 0 to 600 °C, and many on a span of 15 to 65 °C', () => {
    const range = (lo: number, hi: number) => dist(heatRgb(heatStops(lo, hi), 20), heatRgb(heatStops(lo, hi), 60));
    expect(range(0, 600)).toBeLessThan(0.15);
    expect(range(15, 65)).toBeGreaterThan(0.6);
  });
  it('the lightness rises then falls, so the two ends stay dark', () => {
    const low = heatStops(15, 65);
    const mid = luma(heatRgb(low, 48));
    expect(mid).toBeGreaterThan(luma(heatRgb(low, 15)) * 4);
    expect(mid).toBeGreaterThan(luma(heatRgb(low, 65)) * 3);
  });
  it('the shader holds the same numbers', () => {
    const glsl = heatRampGlsl(heatStops(15, 65));
    expect(glsl).toContain('vec3 heatRamp( float T )');
    expect(glsl).toContain('T = clamp( T, 15.00, 65.00 )');
    expect(glsl.match(/mix\(/g)).toHaveLength(RAMP_COLOURS.length - 1);
  });
});
