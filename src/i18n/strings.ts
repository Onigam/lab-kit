import { getLang, type L } from './lang';

// Interface strings shared by every lab (modes, toolbar, panels, guides). A lab adds its own
// with `registerStrings` and resolves any key with `tx`.

const COMMON = {
  modeExplore: ['Explorer', 'Explore'],
  modeAssembly: ['Montage', 'Assembly'],
  modeInstall: ['Installation', 'Installation'],
  modeSim: ['Simulation', 'Simulation'],
  modePlans: ['Plans', 'Drawings'],
  modeLessons: ['Leçons', 'Lessons'],
  modeParts: ['Pièces', 'Parts'],
  modeAbout: ['Sources', 'Sources'],
  explode: ['Éclaté', 'Explode'],
  xray: ['Transparence', 'X-ray'],
  cutaway: ['Coupe', 'Section'],
  flows: ['Flux', 'Flows'],
  labels: ['Étiquettes', 'Labels'],
  labelsMain: ['Principales', 'Main'],
  labelsAll: ['Toutes', 'All'],
  labelsNone: ['Aucune', 'None'],
  slowMo: ['Ralenti', 'Slow-mo'],
  resetView: ['Recentrer', 'Reset view'],
  overviewBtn: ['Vue d’ensemble', 'Overview'],
  hidePanel: ['Masquer le panneau (3D plein écran)', 'Hide the panel (full-width 3D)'],
  showPanel: ['Afficher le panneau', 'Show the panel'],
  panelWide: ['Lire en pleine largeur', 'Read at full width'],
  panelNarrow: ['Revenir à la vue 3D', 'Back to the 3D view'],
  panelResize: [
    'Glisser pour élargir le panneau, double-clic pour la largeur par défaut',
    'Drag to widen the panel, double-click for the default width',
  ],
  overviewHint: [
    'Voir tout le dispositif (double-clic sur une pièce : l’isoler ; double-clic dans le vide : tout revoir)',
    'See the whole device (double-click a part: isolate it; double-click empty space: see everything)',
  ],
  assemble: ['Assembler', 'Assemble'],
  disassemble: ['Désassembler', 'Disassemble'],
  plansTitle: ['Plans de conception', 'Design drawings'],
  plansHelp: [
    'Molette ou pincer : zoomer · glisser : déplacer · double-clic : ajuster.',
    'Wheel or pinch: zoom · drag: pan · double-click: fit.',
  ],
  fitSheet: ['Ajuster', 'Fit'],
  zoomIn: ['Zoomer', 'Zoom in'],
  zoomOut: ['Dézoomer', 'Zoom out'],
  downloadSvg: ['Télécharger SVG', 'Download SVG'],
  printA3: ['Imprimer A3', 'Print A3'],
  seeIn3d: ['Voir en 3D', 'See in 3D'],
  drawingsOfPart: ['Plans', 'Drawings'],
  lineTypes: ['Types de traits', 'Line types'],
  lineThick: ['Trait fort : contours vus', 'Thick: visible outlines'],
  lineThin: ['Trait fin : cotes, hachures', 'Thin: dimensions, hatching'],
  lineCenter: ['Trait mixte : axes', 'Dash-dot: centre lines'],
  lineHidden: ['Tirets : contours cachés', 'Dashed: hidden outlines'],
  overview: ['Aperçu', 'Overview'],
  specs: ['Caractéristiques', 'Specs'],
  maintenance: ['Entretien', 'Maintenance'],
  design: ['Conception', 'Design'],
  material: ['Matériau', 'Material'],
  quantity: ['Quantité', 'Quantity'],
  isolate: ['Isoler', 'Isolate'],
  showAll: ['Tout afficher', 'Show all'],
  focus: ['Centrer', 'Focus'],
  inVideo: ['Dans la vidéo', 'In the video'],
  tip: ['Astuce', 'Tip'],
  close: ['Fermer', 'Close'],
  noSelection: ['Cliquez une pièce ou une étiquette pour l’étudier.', 'Click a part or a label to study it.'],
  partsInScene: ['Pièces de cette vue', 'Parts in this view'],
  dimensions: ['Encombrement', 'Envelope'],
  step: ['Étape', 'Step'],
  partsIn: ['Pièces montées', 'Parts in'],
  tools: ['Outils', 'Tools'],
  torque: ['Couple', 'Torque'],
  duration: ['Durée', 'Time'],
  warning: ['Attention', 'Warning'],
  prev: ['Précédent', 'Previous'],
  next: ['Suivant', 'Next'],
  play: ['Lecture', 'Play'],
  pause: ['Pause', 'Pause'],
  ghost: ['Fantôme', 'Ghost'],
  autoFrame: ['Cadrage auto', 'Auto framing'],
  theBuild: ['Le montage', 'The build'],
  theInstall: ['L’installation', 'The installation'],
  assemblyTitle: ['Guide de montage', 'Assembly guide'],
  installTitle: ['Guide d’installation', 'Installation guide'],
  speed: ['Vitesse du temps', 'Time speed'],
  realTime: ['temps réel', 'real time'],
  allGood: ['Tout fonctionne', 'All good'],
  lessonsTitle: ['Leçons', 'Lessons'],
  runScenario: ['Lancer le scénario', 'Run the scenario'],
  showIn3d: ['Voir en 3D', 'Show in 3D'],
  quiz: ['Quiz', 'Quiz'],
  correct: ['Exact !', 'Correct!'],
  wrong: ['Pas tout à fait.', 'Not quite.'],
  back: ['Retour', 'Back'],
  done: ['terminée', 'done'],
  partsTitle: ['Catalogue des pièces', 'Parts catalogue'],
  search: ['Rechercher…', 'Search…'],
  all: ['Toutes', 'All'],
  catHydraulic: ['Hydraulique', 'Hydraulic'],
  catMechanical: ['Mécanique', 'Mechanical'],
  catElectrical: ['Électrique', 'Electrical'],
  catStructure: ['Structure', 'Structure'],
  catSite: ['Site', 'Site'],
  aboutTitle: ['Sources & crédits', 'Sources & credits'],
  controlsHelp: [
    'Glisser : tourner · clic droit / deux doigts : déplacer · molette / pincer : zoomer · clic : sélectionner',
    'Drag: orbit · right-click / two fingers: pan · wheel / pinch: zoom · click: select',
  ],
  menu: ['Menu', 'Menu'],
} as const satisfies Record<string, readonly [string, string]>;

export type CommonKey = keyof typeof COMMON;

const registry = new Map<string, readonly [string, string]>(Object.entries(COMMON));
const warned = new Set<string>();

/** Add a lab's own interface strings, `key: [fr, en]`. Existing keys are overwritten. */
export function registerStrings(dict: Record<string, readonly [string, string]>): void {
  for (const [key, value] of Object.entries(dict)) registry.set(key, value);
}

/** Resolve any registered key (common or lab-specific). */
export function tx(key: string): string {
  const entry = registry.get(key);
  if (!entry) {
    if (!warned.has(key)) {
      warned.add(key);
      console.warn(`[lab-kit] missing UI string: ${key}`);
    }
    return key;
  }
  return entry[getLang() === 'fr' ? 0 : 1];
}

/** Resolve a key shared by every lab. */
export function t(key: CommonKey): string {
  return tx(key);
}

/** Label/value separator with the right typography (French puts a space before ':'). */
export function colon(): string {
  return getLang() === 'fr' ? ' : ' : ': ';
}

/** Both languages of a registered key, for definitions that store bilingual `{ fr, en }` values. */
export function strL(key: string): L {
  const entry = registry.get(key);
  return entry ? { fr: entry[0], en: entry[1] } : { fr: key, en: key };
}
