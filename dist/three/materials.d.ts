import * as THREE from 'three';
export declare const MAT: {
    alu: () => THREE.MeshStandardMaterial;
    aluDark: () => THREE.MeshStandardMaterial;
    inox: () => THREE.MeshStandardMaterial;
    steel: () => THREE.MeshStandardMaterial;
    steelBlack: () => THREE.MeshStandardMaterial;
    zinc: () => THREE.MeshStandardMaterial;
    copper: () => THREE.MeshStandardMaterial;
    copperBright: () => THREE.MeshStandardMaterial;
    brass: () => THREE.MeshStandardMaterial;
    nickel: () => THREE.MeshStandardMaterial;
    magnetN: () => THREE.MeshStandardMaterial;
    magnetS: () => THREE.MeshStandardMaterial;
    laminations: () => THREE.MeshStandardMaterial;
    redPaint: () => THREE.MeshStandardMaterial;
    printBlack: () => THREE.MeshStandardMaterial;
    printGrey: () => THREE.MeshStandardMaterial;
    printCream: () => THREE.MeshStandardMaterial;
    printWhite: () => THREE.MeshStandardMaterial;
    pvcGrey: () => THREE.MeshStandardMaterial;
    pvcDark: () => THREE.MeshStandardMaterial;
    pvcBlue: () => THREE.MeshStandardMaterial;
    pvcRed: () => THREE.MeshStandardMaterial;
    pe: () => THREE.MeshStandardMaterial;
    rubber: () => THREE.MeshStandardMaterial;
    epdm: () => THREE.MeshStandardMaterial;
    cableRed: () => THREE.MeshStandardMaterial;
    cableBlack: () => THREE.MeshStandardMaterial;
    cableBlue: () => THREE.MeshStandardMaterial;
    cableYellowGreen: () => THREE.MeshStandardMaterial;
    victronBlue: () => THREE.MeshStandardMaterial;
    enclosureGrey: () => THREE.MeshStandardMaterial;
    warningYellow: () => THREE.MeshStandardMaterial;
    wood: () => THREE.MeshStandardMaterial;
    woodLight: () => THREE.MeshStandardMaterial;
    woodDark: () => THREE.MeshStandardMaterial;
    osb: () => THREE.MeshStandardMaterial;
    concrete: () => THREE.MeshStandardMaterial;
    stone: () => THREE.MeshStandardMaterial;
    slate: () => THREE.MeshStandardMaterial;
    pvCell: () => THREE.MeshStandardMaterial;
};
/** Clear acrylic (PMMA). Cheap transparent material instead of transmission. */
export declare function pmma(opacity?: number): THREE.MeshPhysicalMaterial;
/** Instrument glass (gauges, displays). */
export declare function glass(opacity?: number): THREE.MeshPhysicalMaterial;
/** Emissive material for LEDs and glowing elements; tweak `emissiveIntensity` at runtime. */
export declare function emissive(color: THREE.ColorRepresentation, intensity?: number): THREE.MeshStandardMaterial;
/** Ghost material shared by every part shown "in transparency" (x-ray / isolate / guide preview). */
export declare const GHOST: THREE.MeshBasicMaterial;
/** Wire material for not-yet-installed parts in the assembly guide (sael-style ghost). */
export declare const GHOST_WIRE: THREE.MeshBasicMaterial;
