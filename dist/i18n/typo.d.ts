/** French spacing: fixed space before « : » and « » », after « « », between a number and its unit, after `n°` and
 * after a sign; narrow fixed space before « ; ! ? » and inside numbers of 4 digits or more (5 700). Idempotent. */
export declare function frTypo(s: string): string;
/** English spacing: fixed space between a number and its unit, after `No.` and after a sign. Idempotent. */
export declare function enTypo(s: string): string;
