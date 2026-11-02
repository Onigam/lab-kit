# Changelog

Releases of `@onigam/lab-kit`. A lab moves to a release with `npm run kit:bump` (or by changing the tag in its `package.json`).

## 0.6.0 (2026-11-02): the showcase's identity, self-hosted fonts, sim/thermal

The owner's request: more coherence with labs.onigam.io (icons, colours, buttons, links back to it). The approved mock-up is the first item; the rest
goes with it. What a lab must do is in [`docs/kit-0.6.0.md`](docs/kit-0.6.0.md). The 3D worlds, the modes and what films use do not change; on the A3 sheets, only one caption does.

- **The frame in the showcase's identity** (`docs/identity-audit.md`). Palette, lines, grid paper, shadows, pill buttons with a copper primary, chips with a coloured dot,
  links, focus, icons and the mark. Dark mode, by the system's setting and a toggle in the bar, saved under the showcase's key. The bar reads « Onigam Labs / lab's name »; a long name
  wraps to two lines instead of being cut. The common favicon, set at mount. `labTitle()` takes a name in capitals to mixed case.
- **The way back.** The mark and « Onigam Labs », a « Tous les labs » entry in the rail, a block at the end of the Sources panel, with the privacy page.
- **Self-hosted fonts.** Space Grotesk and JetBrains Mono ship in `dist/fonts` (`src/fonts/README.md`): the same versions, characters and widths as Google's, about 53 KB on a first visit, under
  the OFL, the notices in each file. `styles.css` declares them, so a lab that drops its three `<link>` lines no longer contacts Google. On Piggott's production build every request of a first visit went to the
  lab's own address.
- **`@onigam/lab-kit/sim/thermal`** (`docs/sim-thermal.md`). The mass heater's copy, a superset of the sand battery's, byte for byte but for comments, with its 42 tests. `tubeFlow`, the one function
  whose code differs between the two, gives the same results on 288 points. The solar heater's third copy reads `Math.abs(mdot)`: reported, not settled.
- **`detail.ts` in `@onigam/lab-kit/three`.** `applyWear`, `grassDetail`, `contactShadow`, `contactRing`, `patchMaterial`, with the fixes of the labs' reviews (each octave of the bump fades on its own, a tighter fade, a
  tenth of roughness on metals, unfogged shadows with a polygon offset and a rise over two fifths of the falloff). The same bytes and shader text as the Pelton, Piggott, Mill, gravity, mass and sand copies. New and
  optional: `fade` on a contact shadow, for a world with fog (Mill's D12). A lab keeps its picture until it imports them.
- **Options for a world and a part**, all optional, with today's behaviour as default.
  - `SceneModule.near`, `far`: the camera's planes in this world.
  - `PartRegistry.add(id, object, explode, custom, { frame, viewDir })`: what `frameParts` frames for this part and where from. `frameAll`, the sheet's envelope and a part shown alone keep its whole box.
  - `SceneDef.explode: false`: no explode tool in this world; a guide's parts still drop in.
  - `SceneModule.declutter`: with every label on, a name with no room folds into its dot until it is pointed at or selected. On Piggott's turbine, 10 overlaps at 1280 and 14 at 390 become none.
  - `LabDefinition.envelopeMark`: a mark after « Encombrement », such as `*`.
  - Chart markers take `line`, `dot` and `align`, and `label` may go. A marker that gives none of them draws as before, the `y: NaN` trick included.
- **Fixes every lab gets.**
  - `rich()` keeps a star inside the bold: `**Il paie 1,44 kW*.**` no longer shows raw stars (gravity D14).
  - « Encombrement » has its decimal comma in French.
  - The sheets' « Projection européenne » takes two lines and no longer runs into the title block's disclaimer.
  - A phone turned upright with the panel collapsed no longer leaves the 3D 78 px wide (sand D23, gravity D20).
  - The first-visit invitation gives way when a part is selected, the mode changes or the panel moves, for that visit (sand 22).
  - Up to 1460 px the tools are a little denser: the eight of a part selected, in French, fit one row at 1280 and from 1316 px (950 → 814 px). Below about 1270 px they still take two rows.
  - A French sheet with four tabs keeps to one line from 1101 px; up to 1100 px, four tabs in French still take two.
- **Tests.** `npm test` also runs vitest, for the pure modules (64 tests). `dist/` holds no test.

## 0.5.1 (2026-11-01): fixes from the ram pump's reviews

- **Films' ambient occlusion respects the section** (film v5, A1). three's GTAO drew the scene again with one normal material,
  so the clipping planes of the section were lost. The occlusion came from what the section had cut away: dark folds on the flat
  cut faces of the catchment, buried pipes showing through, grass tufts as grey ghosts on the floor, and smudges inside the ram's
  air bell. Each mesh now gets a normal material with its own clipping planes and side. The meshes that never show (shadow
  casters without colour) are left out.
- **Adaptive quality judges slow devices too** (ram pump review, D6). 0.5.0 ignored every frame over 250 ms, so a device at
  under 4 frames a second never lowered its pixel ratio. The governor now judges after 90 frames or after 2 s of frames (at
  least 5), whichever comes first: frames of 200 to 717 ms step down within about 2 s. A gap over 2.5 s is still ignored (a
  world being built), and so is a hidden tab.

## 0.5.0 (2026-10-31): a stable, warmer picture

The picture rule « a warm, full, stable picture » (`docs/lab-quality.md` §3), from the owner's remark on the ram pump film.

- **Anti-aliasing.** The scene is drawn into a multisampled target (MSAA 4). Kit 0.4.0 drew every frame through an
  `EffectComposer` without multisampling, so the canvas's `antialias` never reached the 3D: no anti-aliasing at all. A slow
  orbit of the ram pump's site: 1.6 % → 1.0 % of shimmering pixels (`tools/review/flicker.mjs`).
  - Only the scene target is multisampled (the composer pins the scene pass to it), the post target has no depth buffer and the
    canvas has no multisampling of its own: the GPU process stays at 0.4.0's size (390 × 844 at ×2: 337 MB against 332 to 336;
    1280 × 720: 301 against 308 to 309). Two multisampled targets would have cost 92 MB more.
  - Cost on an M3 Pro (ram pump, ms per frame): +0.3 to +0.4 at 1280 × 720, +0.6 to +0.75 at 390 × 844 ×2.
- **Soft shadow edges.** Every shadow-casting light still at three's default radius gets 2 texels (a light's own radius is
  kept). No extra cost: three's PCF takes the same 5 samples.
- **A look per world** in `scene.userData.look`: `toneMapping`, `exposure`, `saturation`, `environment`, `ao`, `aoRadius`. Nothing
  set draws the picture of 0.4.0 (ACES at 1, three's RoomEnvironment).
  - `PAPER_STUDIO` = Neutral tone mapping at 1.2 and a warm procedural « paper studio » environment. Opt-in per world: the labs'
    paper stays paper (ACES drew `#efe6d3` as a grey `#dddad3`), but materials tuned under ACES come out more saturated (Pelton's
    OSB technical room, Mill's plastered power room turn orange), so a lab checks its palette first.
- **Devices.** The starting quality follows the device (`stage.quality`):
  - 2 GB of memory or less: FXAA at pixel ratio 1.5;
  - a GPU without 4 samples: FXAA;
  - otherwise MSAA 4 up to pixel ratio 2.
  A device whose frames are slow (median over 22 ms) lowers its pixel ratio one step at a time, never back up in the same visit.
- **Films.** An automated browser (`navigator.webdriver`) or `?quality=full` gets the full, fixed picture.
  `Stage.setLook({ adaptive: false, supersample: 3, ao: true })` adds jittered supersampling (8 samples, deterministic, shadows
  drawn once) and three's GTAO in the worlds that ask for it (the `wantsEnv` worlds by default, never a landscape). The composer
  object stays the same for the life of the stage.
- **Grab pivot (lab request).** A drag on the view turns around the selected part where the pointer is on it, even behind a
  translucent shell, then around the first part that is not see-through, then as before. Ram pump, QA D6: the intake screen inside
  the tank no longer leaves the view.
- **Tools.** `tools/review/flicker.mjs` measures the picture's stability; `npm test` runs the self-tests (narration and look).
- The canvas is created without `antialias` (it was never used).

## 0.4.0 and earlier

See the tags `v0.1.0` to `v0.4.0` and the commit messages of `main`.
