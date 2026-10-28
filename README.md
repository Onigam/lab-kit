# @onigam/lab-kit

Shared shell of the interactive 3D energy labs ([Pelton Lab](https://pelton-lab.vercel.app) is the first one):
a lab describes its simulation, 3D worlds and content, and the kit supplies the whole application frame, so every lab
looks and behaves the same.

🇫🇷 [Version française plus bas](#français)

## What it provides

| Subpath                      | Content                                                                                                                                                                     |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@onigam/lab-kit/ui`         | `mountLab(def, …)`, the `LabDefinition` contract, the application shell (top bar, mode rail, panels, toolbar, bottom strip), shared widgets and charts, the drawings viewer |
| `@onigam/lab-kit/three`      | `Stage` (one renderer for all 3D worlds, labels, outline, camera flights), `PartRegistry` (explode, isolate, x-ray), materials and mesh helpers                             |
| `@onigam/lab-kit/drawings`   | A3 SVG drawing kit (views, dimensions, hatching, title block) and the `DrawingSheet` type                                                                                   |
| `@onigam/lab-kit/i18n`       | FR/EN language state, `l(fr, en)`, the registry of interface strings (`registerStrings`, `strL`)                                                                            |
| `@onigam/lab-kit/content`    | Types of the content a lab writes: parts, guide steps, lessons                                                                                                              |
| `@onigam/lab-kit/sim/*`      | Small physics helpers: `hydraulic` (pipe friction, nozzles, valves), `electric` (LiFePO4 curve, cables)                                                                     |
| `@onigam/lab-kit/styles.css` | The graphic frame (paper grid, copper accent, Space Grotesk / JetBrains Mono)                                                                                               |

The frame is the same for every lab and is **not** meant to be restyled: a lab ships no layout CSS, only content.

## Use it in a lab

```jsonc
// package.json — pinned to a release tag; three.js is a peer dependency
"dependencies": {
  "@onigam/lab-kit": "git+https://github.com/Onigam/lab-kit.git#v0.1.0",
  "three": "^0.186.1"
}
```

```ts
// src/main.ts
import '@onigam/lab-kit/styles.css';
import { mountLab } from '@onigam/lab-kit/ui';
import { myLab } from './lab';

mountLab(myLab, {
  app: document.getElementById('app')!,
  viewport: document.getElementById('viewport')!,
  expose: import.meta.env.DEV, // window.__lab = { stage, engine, store } for debugging
});
```

`myLab` is a `LabDefinition`: an id (prefix of the keys stored in the browser), brand, simulation (`step`, `params`,
`set`, `onChange`), 3D worlds (`SceneDef[]`), parts, optional guides, lessons and drawings, the bottom-strip values, the
"Sources" content and a few hooks (`partActions`, `onFrame`, `onCutaway`). Modes without content are hidden
automatically. See `src/ui/lab.ts` for the full contract.
A guide plays in one world by default; a step may name another with `GuideStep.scene`, and the app follows the step
into that world (the Pelton-style build of a device in one world, then its fitting in another).

A heavy world can be built at its first visit instead of at start-up: `module: lazyModule('valve', () => createValveScene())`
(from `@onigam/lab-kit/three`) is a `SceneModule` for the types, so nothing that reads `scene.module` changes; the kit builds
the world when the visitor goes there (or when something reads it).
`SceneDef.overview.actions` open another world (`{ label, scene }`) or another mode (`{ label, mode }`); on a phone they
come before the text of the overview, so the first button is not below the fold of the bottom sheet.

### What the frame does on its own

- **Phone** (up to 760 px wide): the mode rail is one row (the current mode with its name, the others as icons), the
  toolbar rides on the top edge of the bottom sheet and scrolls sideways, the sheet is opaque and can be dragged by its grip
  (a tap still toggles it), the drawings viewer sits above the sheet. Every row that scrolls fades at the edge where it goes
  on. A short screen (up to 500 px high, a phone on its side) puts the toolbar in one row at the top of the view.
- **Framing**: `Stage.setViewInsets({ top, bottom, … })` tells the stage how much of the 3D view the interface covers; the
  frame sets it from the bottom sheet and the toolbar. `frameAll`, `frameBox`, `frameParts` fit the subject in the rest and
  `camera.setViewOffset` centres the projection on it. The last framing is played again on resize, rotation and when the sheet
  opens or closes, unless the visitor has taken the camera. The overview follows the explode slider (it frames the device as
  it will be) and, in a narrow view, fits the real extents of the device instead of its bounding sphere;
  `SceneModule.homePadding` still tunes the wide view.
- **Navigation**: the wheel and the pinch zoom towards the pointer (`zoomToCursor`). A drag with the main button (or one
  finger) that starts on a solid part turns the camera around the point that was pressed: that point stays under the pointer
  and the view does not jump, instead of the part sweeping across the screen around a distant target. A drag that starts on
  nothing turns around the point the camera looks at, as before; right button, two fingers, wheel and pinch are unchanged, a
  press that moves 3 px or less is still a click. `Stage.setPivot(point | null)` sets the point a drag on nothing turns around
  (any framing, such as `frameParts` when a part is selected from the panel, puts it back on the target of the camera).
- **Guides**: changing the world by hand during a guide goes to the nearest step that plays in that world.
- **No WebGL**: `mountLab` shows a message (French and English) and returns `null`.
- **Contrast**: the text greys and accents reach 4.5:1 (`--ink-3`, `--water-ink`, `--copper-ink`, `--leaf-ink`); the fills
  keep their hues (`--ink-4` is the old `--ink-3`).

The kit targets bundlers (Vite): the emitted modules use extensionless relative imports.

**Not implemented yet:** several versions of a machine in one lab (a lab has one version for now; a version switch will be
added when a lab really needs one).

## Develop and release

```bash
npm install
npm run typecheck
npm run build      # dist/ (JavaScript, type declarations, styles.css)
npm run release    # from a clean main: builds, commits dist/ on a detached HEAD, tags vX.Y.Z and pushes the tag
```

`main` never contains `dist/`; a release is a tag whose commit does. Bump `version` in `package.json` before releasing.
To try a kit change in a lab without releasing, `npm install ../lab-kit --no-save` in the lab.

## Licence

MIT.

---

## Français

Socle commun des labs 3D interactifs sur l'énergie ([Pelton Lab](https://pelton-lab.vercel.app) est le premier) : un
lab décrit sa simulation, ses mondes 3D et son contenu, et le kit fournit tout le cadre de l'application, pour que chaque
lab ait le même aspect et le même comportement.

- **`ui`** : `mountLab(def, …)`, le contrat `LabDefinition`, la coque (barre du haut, rail des modes, panneaux, barre
  d'outils, bandeau du bas), les widgets, les graphiques et la visionneuse de plans.
- **`three`** : `Stage` (un seul rendu pour tous les mondes 3D), `PartRegistry` (éclaté, isoler, transparence), matériaux.
- **`drawings`** : kit de dessin SVG A3 (vues, cotes, hachures, cartouche) et type `DrawingSheet`.
- **`i18n`** : langue FR/EN, `l(fr, en)`, registre des textes d'interface. La typographie française (espaces insécables avant « : » et « » », fine avant « ; ! ? », nombres et unités) est appliquée à la résolution des textes, sans toucher aux chaînes sources.
- **`content`** : types du contenu qu'écrit un lab (pièces, étapes de guide, leçons). Un guide se joue dans un monde par défaut ; une étape peut en nommer un autre (`GuideStep.scene`) et
  l'application suit l'étape dans ce monde.
- **`sim/*`** : petites fonctions de physique (hydraulique, électrique).
- **`styles.css`** : le cadre graphique, identique pour tous les labs, que l'on ne restyle pas.

Le cadre se débrouille seul : sur téléphone le rail des modes tient sur une ligne, la barre d'outils se pose sur le bord du
volet du bas (qui se tire du doigt par sa poignée) et défile avec un dégradé là où elle continue ; le sujet 3D est cadré
dans la partie que le volet et la barre d'outils ne cachent pas (`Stage.setViewInsets`), et recadré à la rotation, au
redimensionnement et à l'ouverture du volet ; « Vue d'ensemble » suit le curseur d'éclaté ; la molette et le pincement zooment
vers le pointeur, et un glissement qui démarre sur une pièce fait tourner la caméra autour du point saisi (il reste sous le doigt,
sans saut de vue ; `Stage.setPivot` fixe le point de rotation d'un glissement sur le vide) ; sans WebGL, `mountLab` affiche
un message bilingue et renvoie `null`. Un monde lourd peut être construit à la première visite (`module: lazyModule('id', () => créerMonde())`), et les raccourcis d'une vue d'ensemble peuvent ouvrir un mode (`{ label, mode }`).

Un lab s'installe par dépendance Git épinglée sur un tag (`git+https://github.com/Onigam/lab-kit.git#v0.1.0`), avec
`three` en dépendance « pair ». `main` ne contient jamais `dist/` : `npm run release` construit `dist/`, le commit sur un
HEAD détaché sous le tag `vX.Y.Z` et pousse ce tag. Pas encore géré : plusieurs versions d'une machine dans un même lab.
