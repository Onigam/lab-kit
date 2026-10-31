// Typography of the two languages, applied once where a text is resolved (`tr`, `tx`, `colon`), so no source string
// has to carry invisible characters: fixed spaces where a line must not break, and the French narrow spaces.
const NBSP = ' '; // fixed space
const NNBSP = ' '; // narrow fixed space
const cache = new Map();
/** French spacing: fixed space before « : » and « » », after « « », between a number and its unit, after `n°` and
 * after a sign; narrow fixed space before « ; ! ? » and inside numbers of 4 digits or more (5 700). Idempotent. */
export function frTypo(s) {
    const hit = cache.get(`f${s}`);
    if (hit !== undefined)
        return hit;
    const out = s
        .replace(/(\d) (?=\d{3}(?!\d))/g, `$1${NNBSP}`)
        .replace(/([\d}]) (?=[A-Za-zΩµ°%€×])/g, `$1${NBSP}`)
        .replace(/\bn° ?(?=[\d{])/g, `n°${NBSP}`)
        .replace(/ ([;!?])/g, `${NNBSP}$1`)
        .replace(/ ([:»])/g, `${NBSP}$1`)
        .replace(/« /g, `«${NBSP}`)
        .replace(/([≈±≤≥×→=<>]) (?=[\dA-Za-z{])/g, `$1${NBSP}`);
    cache.set(`f${s}`, out);
    return out;
}
/** English spacing: fixed space between a number and its unit, after `No.` and after a sign. Idempotent. */
export function enTypo(s) {
    const hit = cache.get(`e${s}`);
    if (hit !== undefined)
        return hit;
    const out = s
        .replace(/([\d}]) (?=[A-Za-zΩµ°%€×])/g, `$1${NBSP}`)
        .replace(/\bNo\. (?=[\d{])/g, `No.${NBSP}`)
        .replace(/([≈±≤≥×→=<>]) (?=[\dA-Za-z{])/g, `$1${NBSP}`);
    cache.set(`e${s}`, out);
    return out;
}
