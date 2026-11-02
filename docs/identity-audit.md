# Identity audit: the labs and labs.onigam.io

**Status: approved by the owner on 2 November 2026** (« les après clair et sombre sont très bien et me paraissent cohérents avec le site labs.onigam.io »). It went into kit 0.6.0, whose
[migration note](kit-0.6.0.md) replaces §4 below for a lab. §6 is settled: dark mode stays, the bar reads « Onigam Labs / lab's name », the common favicon replaces each lab's, fonts are self-hosted. This page stays as the record of what was
measured then. Sheet: `~/.cache/lab-review/identity/sheet.jpg`. The request and the order of work are in `energy-labs/PLANNING.md` §4.5.

The rule the audit applies: **the frame stays common and locked in the kit (same layout, same modes, same tools); its identity now follows
the showcase.** The showcase's values are in `onigam-labs/src/styles/base.css`, its mark in `src/render/icons.ts`, its favicon in
`public/favicon.svg`.

## 1. What differs, and what moves

| Element | Showcase | Kit today | Decision | Mock-up |
| --- | --- | --- | --- | --- |
| Page colour | `--bg #eef1ec`, cool sage | `--paper #f3ecdf`, warm cream | **Move** | `--paper` takes the value |
| Second paper | `--bg-2 #e3e8e0` | `--paper-2 #ebe2d0` | **Move** | same |
| Cards, panels | `--surface #f8f9f6` | `--card #fbf8f2` | **Move** | same |
| Ink, three greys | `#12202b`, `#425160`, `#566573` | `#1d2b3a`, `#4f5d6d`, `#586573` | **Move** | same |
| Lines | `rgb(18 32 43 / .16)` frames and cards, `.32` controls | `rgba(29,43,58,.14)`, `.26`, on everything | **Move**, with the showcase's split | frame edges and cards on `--line`, controls on `--line-2` |
| Grid paper | 24 px fine, 120 px bold, `--grid` at 6 % | 24 px only, `--line` at 14 % | **Move** | `#app` and the drawings bench |
| Accent | `--accent #b05e27`, `--on-accent #fff`, `--accent-ink #94491a` | `--copper-deep` same value, `--copper-ink #a05524`, primary buttons in ink | **Move** | new tokens; the old names are kept as aliases |
| Copper | `#c4692c` | `#c4692c` | Same | |
| Water | `#2a7fb8`, ink `#1f6a9a` | `#2a7fb8`, ink `#2470a1` | **Move** the ink | |
| Electricity, storage | `#c99700`, `#6b4fd8` | `--sun`, `--violet`, same values | Same | a part's electrical mark goes from copper to the showcase's yellow |
| Alarm, ok, leaf | `--heat #d1432f`, a domain | `--alarm #c8352b`, `--ok`, `--leaf` | **Stay**: an alarm is not a domain | greens darkened a little to keep 4.5:1 on the new paper |
| Dark mode | yes, system setting then a toggle | none | **Move, owner's call** (§6) | same palette, same key name, a toggle in the bar |
| Colours written in the CSS | none | about 40 lines with a literal (`rgba(251,248,242…)`, `#e7decb`, `#6d1e18`…) | **Move** to tokens | `--glass`, `--warn-*`, `--alarm-ink`, `--ok-soft`, `--formula*`; only the token blocks hold literals |
| Typefaces | Space Grotesk, JetBrains Mono | the same | Same | |
| Font files | self-hosted | Google Fonts, from each lab's `index.html` | **Moved** (`src/fonts/README.md`) | unchanged in the mock-up |
| Body size | 17 px | 15 px | **Stay**: a tool's density, the layout depends on it | |
| Lab's name in the bar | « Onigam Labs » 19 px, weight 600, mixed case | 22 px, weight 700, capitals, spaced 0.18 em | **Move** | 18 px, 600, mixed case, wraps to two lines |
| Tagline | none | 11 px capitals, spaced 0.22 em | **Move** | 11.5 px, plain |
| Panel titles | weight 600, -0.012 em, balanced | weight 700, -0.01 em | **Move** | |
| Mono capitals (eyebrows, tabs, 3D labels) | mono for figures | mono capitals | **Stay**: the language of the drawing sheets, and locked in `ROADMAP` principle A | |
| Language switch | mono 600 | text 13 px | **Move** | |
| Chips | about 14 px, a coloured dot, pill | mono capitals, coloured text | **Move** | dot in the domain's colour; part chips too |
| Buttons | pill, transparent, line-2 border, primary in accent, pressed in ink, hover wash, 1 px press | 10 px radius, card fill, primary in ink | **Move** | same recipe; height stays about 34 px (46 on the showcase): panels are dense |
| Round buttons | 44 px circle | 34 px rounded square | **Move** the shape, **stay** the size | |
| Selects, search, tools, progress | pills | 10 px radius | **Move** | |
| Radii | `--radius 14`, `--radius-s 8` | 12 and 8, plus loose 10s and 14s | **Move** | the floating trays are 24 px, which reads as a pill on one row and stays clean on two |
| Shadows | `0 1px 0 …, 0 22px 44px -28px …` | `0 1px 0 …, 0 8px 24px -12px …` | **Move** | `--shadow`, plus `--shadow-s`, `-up`, `-sheet` for dark |
| Header | 64 px, `--header` glass, blur 14 px, no line until scrolled | 64 px, blur 6 px, a strong line | **Move** | same glass, `--line` (the page does not scroll) |
| Links | inherit colour, soft underline | water blue | **Move** | |
| Focus, selection | 2 px accent, offset 3; copper selection | 2 px copper, offset 2; none | **Move** | |
| Icons | 24 grid, stroke 1.8, round | 24 grid, stroke 1.7, round | **Move** the stroke; `sun`, `menu` redrawn as the showcase's, `moon` added | **the modes' icons stay** (locked) |
| The mark | the runner, inline, copper hub | none: each lab shows its own `brand.icon` | **Move** | `markSvg()` in `ui/brand.ts`, same geometry |
| Favicon | `public/favicon.svg` | one per lab | **Move** | set at mount, so a bump is enough; each lab's file follows (§4) |
| Lab's name in the tab | | capitals | **Move** | `labTitle()` |

## 2. What does not move

| What | Why | Where it is checked |
| --- | --- | --- |
| The 3D worlds: backgrounds (`scene.background`, `#efe6d3` in Piggott), paper studio, materials, lights | owner's rule; films depend on them | no change under `src/three` |
| The A3 sheets: `INK`, paper, cartouche | films open on them; they are printed | no change under `src/drawings`; a sheet stays paper in dark |
| What a film uses: `#app > .topbar`, `.rail`, `.panel`, `.strip`, `#viewport > .toolbar`, `.peek`, `.panel-toggle`, `.narr`, `.dv`, `.label-layer` (`onigam-video/capture/page/chrome.css`) | a film hides them | all ten still match one element; with that stylesheet nothing of the frame shows, the canvas fills the page (last row of the sheet) |
| Tool selectors: `.rail button`, `.scene-switch button`, `.lang-switch button`, `.panel button`, `.dv svg`, `.sheet-row`, `.tool--range input`, `.toolbar button.tool` | `tools/review/walk.mjs`, `onigam-video/brand/tools/lab-assets.mjs`, the showcase's `scripts/lib/capture.mjs` | the new entries are `<a>`, not `<button>`; `.rail button` is still 8 |
| Layout: grid areas, breakpoints, sizes of the bar, rail, panel, strip | locked | same columns and rows; `--top-h` was already the showcase's 64 px |
| Modes, their order and icons; the tools | locked | |
| Token names the labs read (`--water`, `--copper`, `--sun`, `--violet`, `--ink-4`, `--copper-ink`…) | labs' panels use them | kept |
| `SERIES_COLORS` values | labs use them | kept; in dark the charts map those four to the frame's tones |

`onigam-video/brand/brand.css` keeps its own copy of the labs' old ink and paper for the film plates. It does not read the kit, so nothing
changes for the films; aligning it is a matter for the films, not this update.

## 3. The way back to labs.onigam.io

No lab links to the showcase today. Three places, all in the kit, absolute URLs, so they work the same from `<slug>.onigam.io` and from
`<slug>.vercel.app`. The language follows the lab's: French at `/`, English at `/en/`.

| Place | French | English | Target | Notes |
| --- | --- | --- | --- | --- |
| Brand: the mark, and the words « Onigam Labs » beside it | aria-label « Onigam Labs, tous les labs » | "Onigam Labs, all labs" | `https://labs.onigam.io/`, `/en/` | every width; the words go below 1100 px, the mark stays; same tab |
| Rail: an entry under the modes, a line above it | « Tous les labs » | "All labs" | `/#labs`, `/en/#labs` | pinned at the end of the phone row; on a phone on its side the mark does it alone, the column is full |
| Sources panel: a block at the end | « Ce lab fait partie d'Onigam Labs : des laboratoires 3D gratuits, en français et en anglais, pour comprendre l'énergie. » Boutons « Tous les labs », « Confidentialité » | "This lab is part of Onigam Labs: free 3D labs, in French and English, to understand energy." Buttons "All labs", "Privacy" | `/#labs`, `/privacy/` and their `/en/` forms | the privacy page already covers the labs; no lab links to it today |

Not done, possible later: the no-WebGL page (`ui/unsupported.ts`), and each lab's README.

## 4. What every lab must do

1. **`npm run kit:bump`** once the owner has pushed and tagged the kit. That alone brings the frame, the mark, the favicon at mount, the links,
   the theme and the title. On Piggott this needed no source change: `tsc --noEmit` clean, 468 tests pass, `git status` empty.
2. **Replace `public/favicon.svg`** with the showcase's, so the tab is right before the script runs and in saved shortcuts. `brand.icon` may go; it
   is optional now and no longer drawn.
3. **Check the panels in dark, if dark is kept.** Colours written in a lab's own panels stay as they are: gravity battery 11 lines, mill 16, mass heater
   6 (one is `#3a3a3a`, which a dark panel would swallow), Pelton 6, sand battery 3, Piggott 1; ram pump, solar heater, gasifier, biodigester and
   bioclimatic house none.
4. **Walk the frame again** at 1280, 768 and 390 px, FR and EN (`lab-quality.md`), with a note in `docs/qa.md`. Pixel baselines of the frame all change.
5. `brand.title` may stay in capitals: `labTitle()` sets « PIGGOTT LAB » as « Piggott Lab », « LABO DU BÉLIER HYDRAULIQUE » as « Labo du bélier
   hydraulique » and "HYDRAULIC RAM LAB" as "Hydraulic Ram Lab". All eleven labs' current titles were tried. A lab may write its name in mixed case; it is then left as written.
   Worth a look by the owner: some names differ from the showcase's cards (« Labo du stockage par gravité » against « Batterie à gravité »).

`lab-template` follows: it should take the same favicon, and its `package.json` still points at the kit's `v0.1.0`.

Nothing is needed in the showcase unless fonts move (§6): its privacy page already lists the theme among what stays in the browser.

## 5. What could break

- **Cream 3D beside a cooler frame.** The worlds keep their warm paper while the frame goes sage. It reads as a drawing on a bench, like the showcase's
  own cards, but the warm and cool now meet at the edge of the view. Changing it would mean changing the 3D, so it is not proposed.
- **Dark frame, bright world.** In dark, the world stays bright. The showcase's dark cards do the same with their thumbnails, but at a lab's scale it is
  a large bright surface.
- **Primary buttons change weight.** They go from ink to copper, in every lab, so they stand out more. Labs that use several primaries in a row will show it.
- **A click on the brand leaves the lab.** Same tab, as a home link does; the simulation and the guide stop, and Back may reopen the lab from its start. The rail entry
  is the same. The lessons' progress is kept.
- **Theme.** Saved per subdomain, since the labs are separate sites: a choice made on the showcase does not cross over; the system's setting does. A visitor who
  chose against the system may see a flash of the other theme before the script runs; a line in `index.html`, as on the showcase, would close it.
- **`text-wrap: balance`** falls back to plain wrapping on older browsers. Harmless.
- **The spoken guides.** A search of every lab's `narration/fr.json` and `en.json` for words on a button's colour or the corners of the screen found nothing the new bar
  contradicts. A search, not a listening.
- **Other labs are untried.** Only Piggott has been run. Long names were tested by writing them into Piggott's bar: whole at 320, 360, 390, 768, 1024, 1101, 1280 and
  844 × 390. A lab with four worlds has more room than Piggott's five.
- **The rail's row on a phone is fuller.** The eight modes still fit at 390 px with any mode active, in French and English, with no room left over; on narrower phones
  (375 px and under, where they fitted before) the row scrolls as it was built to, and the fade now stops before the way home.

## 6. The owner's calls

1. **Dark mode in the labs: yes or no.** The sheet shows it. If no, drop the two dark blocks and the toggle; nothing else depends on them.
2. **« Onigam Labs / Piggott Lab » in the bar**: the wording and the slash, from 1100 px up.
3. **Fonts: self-host or keep Google Fonts.** The showcase self-hosts; the labs contact Google, and the privacy page says so. Self-hosting means shipping two
   variable fonts in the kit (about 80 KB per lab), removing the `<link>` from eleven `index.html`, and rewriting that paragraph of the privacy page in both
   languages. Recommended, but it is a change of its own and was left out of the mock-up.
4. **Each lab's own favicon retires** for the common mark, as `PLANNING.md` §4.5 plans. Their drawings are lost from the tab.

## 7. `ROADMAP.md`, principle A, once approved

The row « Identité visuelle » would read: « celle de la vitrine `labs.onigam.io` (`onigam-labs/src/styles/base.css`) : même palette en clair et en sombre, mêmes boutons, même
marque et même favicon, polices Space Grotesk (texte) et JetBrains Mono (chiffres, étiquettes) ; le cadre reste verrouillé dans le kit. La 3D et les planches gardent leurs couleurs. » And the
list gains a line: « Lien vers la vitrine : la marque, l'entrée Tous les labs du rail, le panneau Sources. »
