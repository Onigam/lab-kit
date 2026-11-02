# Moving a lab to kit 0.6.0

The kit is pushed and tagged by the owner; a lab moves afterwards, one at a time, on its own session. In a throwaway copy of each lab's committed `HEAD`, `tsc` and the tests passed against this release with no source change.

## What a lab must do

1. **`npm run kit:bump`.** Brings the frame, the mark, the favicon at mount, the links, the theme, the title and the fonts. It runs the lab's typecheck and build.
2. **`public/favicon.svg`.** Copy `onigam-labs/public/favicon.svg` over it, so that the tab is right before the script runs and in saved shortcuts. `brand.icon` may go from `src/lab.ts`: it is no longer drawn.
3. **`index.html`.** Delete these six lines, nothing else. Until they go, the lab still calls Google, whatever the kit ships.

   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com" />
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
   <link
     href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@400;500;600;700&display=swap"
     rel="stylesheet"
   />
   ```

4. **Colours written in a panel, in dark.** The frame changes with the theme; a colour written in a lab's own panel does not. Look at each on the dark card (`#14293a`) and move what cannot be read to a token (`var(--water)`, `--copper`, `--sun`, `--violet`, `--ink-4`…). The one known to be lost: `#3a3a3a` in the mass heater's `src/panels/model.ts`.

   | Lab | Lines | Where |
   | --- | --- | --- |
   | Mill | 16 | `src/panels/model.ts` 15, `sim.ts` 1 |
   | Gravity battery | 11 | `src/panels/model.ts` 9, `sim.ts` 2 |
   | Mass heater | 6 | `src/panels/model.ts` |
   | Pelton | 6 | `src/panels/sim.ts` |
   | Sand battery | 3 | `src/panels/model.ts` |
   | Piggott | 1 | `src/panels/sizes.ts` |
   | Ram pump, solar heater, gasifier, biodigester, bioclimatic house | 0 | |

5. **Walk the frame again**, by someone who did not build the lab (`lab-quality.md`): 1280, 768 and 390 px, French and English, light and dark, every mode, a clean console, a note in `docs/qa.md`. Pixel baselines of the frame all change. What to look at in particular: the primary buttons, now copper; a long name in the bar; the sheets' caption beside the title block; a part with four tabs; a world in dark, whose 3D stays bright.

Nothing else is required. `brand.title` may stay in capitals (`labTitle()`), or be written in mixed case.

## What changes without a lab doing anything

The look of the frame (`identity-audit.md`). Links to labs.onigam.io. The fixes listed in the [changelog](../CHANGELOG.md): the raw `**`, the decimal comma, the sheets' caption, the rotated phone, the invitation, a denser toolbar up to 1460 px, the tabs. Not the 3D, not the modes, not what films use: `onigam-video/capture/page/chrome.css` still matches all ten of its selectors and shows only the canvas.

## What a lab may take when it is ready

| Option | Replaces |
| --- | --- |
| `SceneModule.near`, `far` | `holdDepthRange` in the sand lab's `world.ts`; the `onBeforeRender` of the mass heater's `homestead/scene.ts`; gravity's held `maxDistance` and fog limit, checked again |
| `registry.add(…, { frame, viewDir })` | The sand lab's `FramedRegistry` and `setFocus` (its `overviewExtra` and `lightGhosts` have no counterpart yet: they stay until they do). The kit reads `frame` in the same coordinates: world, assembled |
| `SceneDef.explode: false` | The zeroed offsets of `site` in the sand and gravity labs; give the offsets back to the guides |
| `SceneModule.declutter` | Nothing: it is new. Move anchors first, and try it on the worlds whose labels still collide |
| `LabDefinition.envelopeMark: '*'` | For a lab whose figures carry a tag |
| Chart markers' `line`, `dot`, `align` | `dayMarkers` in the sand lab's `src/panels/model.ts`; gravity's markers that draw a dot to carry a name |
| `applyWear`, `grassDetail`, `contactShadow`, `contactRing` from `@onigam/lab-kit/three` | The same functions in a lab's `src/three/detail.ts`, with the same results (the mass heater's `patch` is `patchMaterial`). Keep what is the lab's own: Pelton's and the ram pump's melting grass, stones and film shutter. **The ram pump's copy has the older numbers** (0.35 of roughness on metals, a rise over a fifth), so its picture would change: a choice to make with its film in view |

### `sim/thermal`, for the sand battery and the mass heater

Rehearsed in throwaway copies: `tsc` clean, every figure test passing.

1. `git rm -r src/sim/thermal`.
2. Change the imports. Sand battery, 6 files: `src/panels/model.ts`, `src/data/data.test.ts`, `src/sim/engine.ts`, `silo.ts`, `plant.ts`, `figures.test.ts`. Mass heater, 9 files: `src/sim/machine.ts`, `plant.ts`, `runs.ts`, `combustion.ts`, `engine.test.ts`, `figures.test.ts`, `src/drawings/pl05-bench.ts`, and for the ramp `src/three/thermal.ts`, `thermal.test.ts`.

   ```ts
   import { … } from '@onigam/lab-kit/sim/thermal';        // was '../sim/thermal' or './thermal'
   import { … } from '@onigam/lab-kit/sim/thermal/ramp';   // was '../sim/thermal/ramp'
   ```

3. A lab's own `src/three/thermal.ts` stays: it is that lab's thermal view, not this module.

The test needs `test.server.deps.inline: ['@onigam/lab-kit']` in `vite.config.ts`, which both labs have. The solar heater's copy waits: `docs/sim-thermal.md`.

## The showcase, once every lab has moved

Do it only when the eleven are deployed: until then it is still true. In `onigam-labs`, the paragraph « Polices » of the privacy page (`src/i18n/fr.ts:180`, `src/i18n/en.ts:185`). These sentences stop being true:

> Les labs chargent les leurs depuis Google Fonts : votre navigateur contacte alors Google, qui reçoit votre adresse IP, selon ses [règles de confidentialité](https://policies.google.com/privacy).

> The labs load theirs from Google Fonts: your browser then contacts Google, which receives your IP address, under its [privacy policy](https://policies.google.com/privacy).

The test that holds them goes too (`src/site.test.ts:108`, « says that the labs load their fonts from Google, as they do »). The YouTube paragraph keeps its link to Google's policy, which the test at line 100 needs.

## `lab-template`

It follows on its own `main`: the common favicon, no font links, no `brand.icon`, and the pin at `v0.6.0`. Its `package-lock.json` can only be written once the tag exists: `npm install` then, and commit it, or the template's CI (`npm ci`) refuses.

## Requests that stay open

Each stays in its lab's `docs/kit-requests.md`. Not done in this release, with the reason.

| Request | Asked by | Why not now |
| --- | --- | --- |
| The Plans panel does not follow the sheet (`drawing` in `panelKeys`) | mass 18 | A real bug in every lab and nearly one word, but a redraw scrolls the panel to the top: it needs that handled. The first candidate for 0.6.1 |
| Picking through `clipIntersection` | sand 10, mass 15, mill 20 | Three labs have a workaround that works; changing `cast` touches every pick, to be tried on those worlds |
| Clamp a negative `dt` in `Stage.render` | mill 13 | Changes the first flight in a lab that works today; small, for 0.6.1 |
| `walk.mjs` on Metal | sand 15, 21 | Tooling, not the release; the labs' reviewers have their scripts |
| A landscape not called `site`: `SceneModule.landscape`, `maxPolar` | gravity 14, mass 10 | `near` and `far` answer the part that was asked of this release; the rest also moves `frameAll` |
| An overview box per world | sand 17 | The frame box per part was the request several labs hit |
| `merge.ts`, `common.ts`, `framing.ts`, `cut.ts`, the sky, water, puffs, flames, `patchMinWidth`, dots on a true speed | sand 12, gravity 16, 17, mass 16, mill 10, 17, 21, piggott 9, solar 8 | The copies have diverged (`scope`, `bakeKey`), and moving them means checking every lab's picture again. `detail.ts` was the part with fixes to carry |
| `sim/mech`, `sim/market`, lead-acid and bridge in `sim/electric`, `sim/stats`, a seeded `rng` | mill 7, gravity 1, sand 3, piggott 1, 2, solar 9 | Each needs the same comparison as `sim/thermal`, and its own second user or decision |
| The solar heater's `fluids`, `solar`, `loop`, `layers`, `Math.abs(mdot)` | solar 1 | Its `tubeFlow` differs on a negative flow: a question of physics to settle first (`sim-thermal.md`) |
| A widget to paint hours; `readout` with a tag; `lossBar`; `status`; `section` closed; `num`, `months`; slider handles; an alarm with an action; the fake DOM as `@onigam/lab-kit/testing` | sand 1, 6, 7; mill 2, 3, 5, 6; gravity 2 to 5, 9, 10; mass 6, 9; solar 4, 5; piggott 4, 6, 7, 8 | New interface to design, more than a fix; a release of its own |
| Speed labels, a long clock, a clock with no date, a time scrubber, a tool slot in the toolbar | sand 4, 5; mill 8; gravity 12; mass 4, 5, 11, 12; solar 3, 7 | They change the strip and the toolbar in every lab: a design to show the owner first |
| `heatLegend`, a safety banner, part categories a lab names, `Hotspot.visible`, a hotspot's side | sand 8, 9; mass 2, 3, 8, 13; solar 6; gravity 19 | New frame elements. `declutter` covers the collisions of gravity 19 for now |
| Chart: log axes, ticks, bands, a closed curve, a zero line, a clip, `setOptions`, `yUnit`, a shared yearly chart | gravity 6, 8; mill 4, 9; mass 7; solar 2; sand 6; piggott 3 | A chart rewrite, not an option: too long for this release |
| The camera in `update`, what X-ray is doing in `ViewOpts`, `sim` in `update`, compile ahead, `registry.refresh`, `overlay`, `points`, `bounds` of instanced meshes, walls that fade | sand 15; mass 14, 17; gravity 15, 18; mill 11, 18, 22; piggott 10, 11 | Changes to the stage's contract, each to try on the labs that asked |
| Section open at first, a quarter section, label room in the overview, guide steps on a curve | mill 12, 19, 21; piggott 12 | Each a change of the worlds' framing or tools, for the labs that want it to try first |
| `Chart`, `grid`, hatches, symbols, a bilingual `scale`, `View` holes, arrows and angles in the sheets' kit | sand 11; mill 14, 15, 16, 23 to 27; piggott 13, 14, 15 | The A3 sheets stay as they are in this release |
| ESM with extensions in `dist` | mill 1, piggott 5 | Every lab has the one line of Vite config; it changes every import of the build |
| `duration` bilingual on a guide step, `narration` cues for a scenario, a note on `timeScale` | sand 10; gravity 11, 13 | Small; nobody is blocked |
| A grab that takes the camera into a solid | sand D22 | A change of the grab, to try on `pipe-cell` |
