/**
 * The part sheet's « Encombrement », from the size of a part's box in metres: in metres from a metre up, else in millimetres, each language with its own
 * decimal mark. It may wrap at the signs on a narrow panel, never between the last figure and its unit.
 */
export function envelopeText(size, lang, mark = '') {
    const big = size.x >= 1 || size.y >= 1 || size.z >= 1;
    const f = (v) => {
        const s = big ? v.toFixed(2) : String(Math.round(v * 1000));
        return lang === 'fr' ? s.replace('.', ',') : s;
    };
    return `${f(size.x)} × ${f(size.y)} × ${f(size.z)} ${big ? 'm' : 'mm'}${mark}`;
}
