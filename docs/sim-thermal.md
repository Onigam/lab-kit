# `@onigam/lab-kit/sim/thermal`

The thermal core of the labs: an RC network with enthalpy nodes and temperature-dependent conduction, grids of massive bodies, what passes heat
between things, the draft of a warm column, radiation, a false-colour ramp and the stratification of a fluid tank. Pure functions and plain data: no
DOM, no three.js, no import from a lab or from the rest of the kit, no lab's name (a test holds both). SI, temperatures in °C. It is imported from
its own path, it is not in the `sim` barrel: `import { createNetwork, tubeFlow } from '@onigam/lab-kit/sim/thermal'`.

It came from the sand battery's lab and was extended by the mass heater's. The code is the mass heater's copy at `50292e4`; only comments changed. The
tests came with it (`src/sim/thermal/thermal.test.ts`, run by `npm test`). A lab's own figures stay in that lab's tests.

| File | Interface | For |
| --- | --- | --- |
| `material.ts` | `Material { rho, c(T), h(T), Tof(h), k(T) }`, `makeMaterial`, `constantMaterial`, `piecewise`; `quartzSand`, `quartzPure`, `crushedSoapstone`, `liquidWater` | Any table of a material. Other materials come with the lab that sources them |
| `air.ts` | `airRho`, `airCp`, `airMu`, `airK`, `airPr` | Any air path |
| `network.ts` | `createNetwork(nodes, links)`, `stepNetwork(net, dt)` (stable substeps), `stableStep`, `setNodeTemperature`, `setLinkConductance`, `updateConductances`, `totalEnthalpy`, `totalBoundaryEnergy`. Nodes: mass of a material, plain capacity, or fixed. Links: a fixed G in series with k(T) paths. `net.Q[i]`: heat applied, W | The RC core |
| `grid.ts` | `buildGrid({ geometry: 'rz' \| 'xy', xEdges, yEdges, material, T })` gives nodes, links, `id(i, j)`, `faces(side)`; `uniformEdges` | A massive body: a stove's mass, a wall |
| `exchange.ts` | `seriesU`, `surfaceLoss`, `flowHeat`, `effectiveness(UA, Cmin, Cmax, 'counter' \| 'parallel' \| 'cross')`, `fluidLine`, `marchFluid`, `pipeCellConductance`, `pipeCellFactor`, `pipeCellTime`, `pipeCellShape`, `pitchRadius`, `tubeFriction`, `tubeNusselt`, `RE_LAMINAR`, `tubeFlow`, `tubePressureDrop` | Insulation, exchangers, a fluid through a mass, floor loops, flues |
| `draft.ts` | `GRAVITY`, `stackDraft(H, Tin, Tbeside)`, `velocityHead(mdot, A, rho)`, `solveLoopFlow(residual, previous, max, tol, pressureTol)`: a signed flow that keeps its branch | A warm column, a thermosiphon |
| `radiation.ts` | `SIGMA`, `radiationConductance(ε, A, T1, T2)`, `enclosedEmissivity`, `naturalFilm(dT, C)`, `FILM_VERTICAL`, `FILM_FACING_UP` | What a hot surface gives to a room |
| `ramp.ts` | `RAMP_COLOURS`, `heatStops(min, max)`, `heatRgb(stops, T, out)` (linear RGB, no allocation), `heatRampGlsl(stops)`, `linearRgb` | The same false colours over any span |
| `stratify.ts` | `buoyancyMix(T, w)`: layers of a **fluid** column made stable, energy kept | A hot-water tank. Not a bed of stone, which does not convect |

Functions change only what is passed to them, in place and without allocating in the hot path. Tested against closed forms: a two-node exponential, a
slab's series solution, a cylinder's first mode, textbook ε-NTU values, a fine radial integration of the pipe cell, energy to rounding with c and k changing.

## An open question: `tubeFlow` with a negative flow

The solar heater's lab holds a third copy of this module, in which `tubeFlow` reads `Math.abs(mdot)`. This copy reads `mdot`, so a reversed flow gets
`Re = 1`, laminar, whatever its speed. The two were not settled here: on a grid of 288 points, this copy, the sand battery's and the mass heater's give the same
numbers to the last bit, the solar heater's differs on every point with `mdot < 0` and on no other. Whoever owns that physics decides, then the labs' figures are checked
again. The solar heater's own additions (`fluids.ts`, `solar.ts`, `loop.ts`, `layers.ts`) are not here yet.
