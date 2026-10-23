import * as THREE from 'three';

// Shared PBR palette. Every call returns a fresh material so a part can be ghosted,
// highlighted or clipped without affecting the others.

type Std = THREE.MeshStandardMaterialParameters;
const std = (p: Std) => () => new THREE.MeshStandardMaterial(p);

export const MAT = {
  // metals
  alu: std({ color: 0xc4cad0, metalness: 0.85, roughness: 0.36 }),
  aluDark: std({ color: 0x8d949b, metalness: 0.8, roughness: 0.45 }),
  inox: std({ color: 0xd9dcdf, metalness: 1, roughness: 0.22 }),
  steel: std({ color: 0x5b6168, metalness: 0.8, roughness: 0.45 }),
  steelBlack: std({ color: 0x2a2d31, metalness: 0.6, roughness: 0.55 }),
  zinc: std({ color: 0xb7bcc2, metalness: 0.9, roughness: 0.3 }),
  copper: std({ color: 0xb8692e, metalness: 1, roughness: 0.32 }),
  copperBright: std({ color: 0xd98a4a, metalness: 1, roughness: 0.25 }),
  brass: std({ color: 0xc9a447, metalness: 1, roughness: 0.3 }),
  nickel: std({ color: 0xc9cbce, metalness: 1, roughness: 0.25 }),
  magnetN: std({ color: 0xa8342b, metalness: 0.55, roughness: 0.35 }),
  magnetS: std({ color: 0x2c58a0, metalness: 0.55, roughness: 0.35 }),
  laminations: std({ color: 0x4a4e55, metalness: 0.9, roughness: 0.4 }),
  redPaint: std({ color: 0xb3261e, metalness: 0.2, roughness: 0.55 }),

  // plastics & 3D prints
  printBlack: std({ color: 0x232528, metalness: 0, roughness: 0.72 }),
  printGrey: std({ color: 0x80868e, metalness: 0.05, roughness: 0.62 }),
  printCream: std({ color: 0xe6dfcc, metalness: 0, roughness: 0.6 }),
  printWhite: std({ color: 0xf2f2ee, metalness: 0, roughness: 0.55 }),
  pvcGrey: std({ color: 0x6b7177, metalness: 0.05, roughness: 0.42 }),
  pvcDark: std({ color: 0x3c4146, metalness: 0.05, roughness: 0.45 }),
  pvcBlue: std({ color: 0x1f6fd1, metalness: 0.05, roughness: 0.38 }),
  pvcRed: std({ color: 0xd0352a, metalness: 0.05, roughness: 0.4 }),
  pe: std({ color: 0x1b1d20, metalness: 0, roughness: 0.48 }),
  rubber: std({ color: 0x151618, metalness: 0, roughness: 0.92 }),
  epdm: std({ color: 0x1e1f21, metalness: 0, roughness: 0.85 }),
  cableRed: std({ color: 0xc0261f, metalness: 0, roughness: 0.5 }),
  cableBlack: std({ color: 0x17181a, metalness: 0, roughness: 0.5 }),
  cableBlue: std({ color: 0x1d5fb5, metalness: 0, roughness: 0.5 }),
  cableYellowGreen: std({ color: 0x8fb52a, metalness: 0, roughness: 0.5 }),
  victronBlue: std({ color: 0x1f7ad6, metalness: 0.1, roughness: 0.45 }),
  enclosureGrey: std({ color: 0xd9dbd8, metalness: 0, roughness: 0.6 }),
  warningYellow: std({ color: 0xf2c014, metalness: 0, roughness: 0.6 }),

  // natural & building
  wood: std({ color: 0x9a6b3f, metalness: 0, roughness: 0.85 }),
  woodLight: std({ color: 0xc89b67, metalness: 0, roughness: 0.8 }),
  woodDark: std({ color: 0x5e4129, metalness: 0, roughness: 0.9 }),
  osb: std({ color: 0xc8a06a, metalness: 0, roughness: 0.9 }),
  concrete: std({ color: 0xa9a59c, metalness: 0, roughness: 0.95 }),
  stone: std({ color: 0x77736b, metalness: 0, roughness: 0.95 }),
  slate: std({ color: 0x4d5257, metalness: 0.1, roughness: 0.8 }),
  pvCell: std({ color: 0x1a2a4a, metalness: 0.6, roughness: 0.25 }),
};

/** Clear acrylic (PMMA). Cheap transparent material instead of transmission. */
export function pmma(opacity = 0.2): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: 0xe8f4f8,
    metalness: 0,
    roughness: 0.04,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** Instrument glass (gauges, displays). */
export function glass(opacity = 0.15): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.02,
    clearcoat: 1,
    transparent: true,
    opacity,
    depthWrite: false,
  });
}

/** Emissive material for LEDs and glowing elements; tweak `emissiveIntensity` at runtime. */
export function emissive(color: THREE.ColorRepresentation, intensity = 1): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.4,
  });
}

/** Ghost material shared by every part shown "in transparency" (x-ray / isolate / guide preview). */
export const GHOST = new THREE.MeshBasicMaterial({
  color: 0x2a4a6b,
  transparent: true,
  opacity: 0.07,
  depthWrite: false,
});

/** Wire material for not-yet-installed parts in the assembly guide (sael-style ghost). */
export const GHOST_WIRE = new THREE.MeshBasicMaterial({
  color: 0x5b8bb5,
  wireframe: true,
  transparent: true,
  opacity: 0.12,
  depthWrite: false,
});
