import { getLang, tr, type L } from '../i18n';

// What ties a lab to its family: the showcase's address, the Onigam mark, the favicon and the way a lab's name is set. The frame
// stays the kit's; its identity follows labs.onigam.io (onigam-labs/src/render/icons.ts and public/favicon.svg, drawn the same).

const SHOWCASE = 'https://labs.onigam.io';

/** The showcase in the visitor's language: French at `/`, English at `/en/`. `labs` opens on the gallery. */
export function showcaseUrl(section?: 'labs'): string {
  return `${SHOWCASE}${getLang() === 'en' ? '/en/' : '/'}${section ? `#${section}` : ''}`;
}

/** The privacy page of the showcase, which covers the labs too. */
export function privacyUrl(): string {
  return `${SHOWCASE}${getLang() === 'en' ? '/en/privacy/' : '/privacy/'}`;
}

/** The brand mark: a runner seen from the front, twelve buckets around a hub. Strokes take the text colour, the hub is copper. */
export function markSvg(size = 30): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const el = (tag: string, attrs: Record<string, string | number>): SVGElement => {
    const node = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
    return node;
  };
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 12;
    const [s, c] = [Math.sin(a), Math.cos(a)];
    return `M${(16 + s * 9).toFixed(2)} ${(16 - c * 9).toFixed(2)}L${(16 + s * 14).toFixed(2)} ${(16 - c * 14).toFixed(2)}`;
  }).join('');
  const svg = el('svg', { viewBox: '0 0 32 32', width: size, height: size, 'aria-hidden': 'true', focusable: 'false' });
  svg.append(
    el('circle', { cx: 16, cy: 16, r: 7, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6 }),
    el('path', { d: ticks, stroke: 'currentColor', 'stroke-width': 2.4, 'stroke-linecap': 'round' }),
    el('circle', { cx: 16, cy: 16, r: 2.6, fill: 'var(--copper)' }),
  );
  return svg as SVGSVGElement;
}

const FAVICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#12202b"/><circle cx="16" cy="16" r="7" fill="none" stroke="#eef1ec" stroke-width="1.6"/><path d="M16 7.5V4.5M20.5 8.7l1.5-2.6M23.3 11.5l2.6-1.5M24.5 16h3M23.3 20.5l2.6 1.5M20.5 23.3l1.5 2.6M16 24.5v3M11.5 23.3l-1.5 2.6M8.7 20.5l-2.6 1.5M7.5 16h-3M8.7 11.5L6.1 10M11.5 8.7L10 6.1" stroke="#eef1ec" stroke-width="2.4" stroke-linecap="round" fill="none"/><circle cx="16" cy="16" r="2.6" fill="#c4692c"/></svg>';

/** The tab shows the showcase's favicon, whatever icon the lab's page declares. */
export function applyFavicon(): void {
  const href = `data:image/svg+xml,${encodeURIComponent(FAVICON)}`;
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.append(link);
  }
  link.type = 'image/svg+xml';
  link.href = href;
}

/**
 * A lab's name as the showcase sets it. The labs wrote theirs in capitals for the former letter-spaced title: a name given once
 * for both languages takes a capital per word (« Piggott Lab »), a bilingual one a French phrase (« Labo du bélier hydraulique »)
 * or an English title (« Hydraulic Ram Lab »). A name already in mixed case is left as written.
 */
export function labTitle(title: string | L): string {
  const text = tr(title);
  if (text !== text.toLocaleUpperCase()) return text;
  const lang = getLang();
  const lower = text.toLocaleLowerCase(lang);
  const phrase = lang === 'fr' && typeof title !== 'string' && title.fr !== title.en;
  return phrase
    ? lower.replace(/^\p{L}/u, (c) => c.toLocaleUpperCase(lang))
    : lower.replace(/(^|[\s-])(\p{L})/gu, (_, gap: string, c: string) => gap + c.toLocaleUpperCase(lang));
}
