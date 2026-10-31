# Changelog

Releases of `@onigam/lab-kit`. A lab moves to a release with `npm run kit:bump` (or by changing the tag in its `package.json`).

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
