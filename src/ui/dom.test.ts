import { describe, expect, it } from 'vitest';
import { boldParts } from './dom';
import { envelopeText } from './envelope';

const shown = (text: string) =>
  boldParts(text)
    .map((p) => (p.bold ? `<${p.text}>` : p.text))
    .join('');

describe('**bold** in the rich text', () => {
  it('as before: bold, plain and a mark outside the bold', () => {
    expect(shown('a **b** c')).toBe('a <b> c');
    expect(shown('**a** and **b**')).toBe('<a> and <b>');
    expect(shown('5 kW* then **b** and 3 W*')).toBe('5 kW* then <b> and 3 W*');
    expect(shown('line\n**two\nlines** end')).toBe('line\n<two\nlines> end');
    expect(shown('plain')).toBe('plain');
    expect(shown('')).toBe('');
  });
  it('a star mark inside the bold leaves no raw stars (gravity D14)', () => {
    expect(shown('**Il paie 1,44 kW*.**')).toBe('<Il paie 1,44 kW*.>');
    expect(shown('**Oui, mais pour 54 Wh* seulement.**')).toBe('<Oui, mais pour 54 Wh* seulement.>');
    expect(shown('x **sous 1,90 kW* au crochet, la machine ne rend rien** y')).toBe(
      'x <sous 1,90 kW* au crochet, la machine ne rend rien> y',
    );
  });
  it('a star mark at the very end of the bold stays in it', () => {
    expect(shown('**54 Wh***')).toBe('<54 Wh*>');
    expect(shown('**54 Wh*** et **7 kW***.')).toBe('<54 Wh*> et <7 kW*>.');
  });
  it('a marker with no partner stays as text, as before', () => {
    expect(shown('a ** b')).toBe('a ** b');
    expect(shown('****')).toBe('****');
  });
});

describe('« Encombrement »', () => {
  it('uses the decimal comma in French and the point in English (gravity D28)', () => {
    const size = { x: 7, y: 29.35, z: 7 };
    expect(envelopeText(size, 'fr')).toBe('7,00 × 29,35 × 7,00\u00a0m');
    expect(envelopeText(size, 'en')).toBe('7.00 × 29.35 × 7.00\u00a0m');
  });
  it('small parts stay in whole millimetres', () => {
    expect(envelopeText({ x: 0.1, y: 0.25, z: 0.04 }, 'fr')).toBe('100 × 250 × 40\u00a0mm');
    expect(envelopeText({ x: 0.1, y: 0.25, z: 0.04 }, 'en')).toBe('100 × 250 × 40\u00a0mm');
  });
  it('carries the mark a lab gives, and none by default', () => {
    expect(envelopeText({ x: 1, y: 2, z: 3 }, 'en', '*')).toBe('1.00 × 2.00 × 3.00\u00a0m*');
    expect(envelopeText({ x: 1, y: 2, z: 3 }, 'en')).toBe('1.00 × 2.00 × 3.00\u00a0m');
  });
});
