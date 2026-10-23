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
- **`i18n`** : langue FR/EN, `l(fr, en)`, registre des textes d'interface.
- **`content`** : types du contenu qu'écrit un lab (pièces, étapes de guide, leçons).
- **`sim/*`** : petites fonctions de physique (hydraulique, électrique).
- **`styles.css`** : le cadre graphique, identique pour tous les labs, que l'on ne restyle pas.

Un lab s'installe par dépendance Git épinglée sur un tag (`git+https://github.com/Onigam/lab-kit.git#v0.1.0`), avec
`three` en dépendance « pair ». `main` ne contient jamais `dist/` : `npm run release` construit `dist/`, le commit sur un
HEAD détaché sous le tag `vX.Y.Z` et pousse ce tag. Pas encore géré : plusieurs versions d'une machine dans un même lab.
