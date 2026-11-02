/**
 * The part sheet's « Encombrement », from the size of a part's box in metres: in metres from a metre up, else in millimetres, each language with its own
 * decimal mark. It may wrap at the signs on a narrow panel, never between the last figure and its unit.
 */
export declare function envelopeText(size: {
    x: number;
    y: number;
    z: number;
}, lang: 'fr' | 'en', mark?: string): string;
