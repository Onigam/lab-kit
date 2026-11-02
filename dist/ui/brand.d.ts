import { type L } from '../i18n';
/** The showcase in the visitor's language: French at `/`, English at `/en/`. `labs` opens on the gallery. */
export declare function showcaseUrl(section?: 'labs'): string;
/** The privacy page of the showcase, which covers the labs too. */
export declare function privacyUrl(): string;
/** The brand mark: a runner seen from the front, twelve buckets around a hub. Strokes take the text colour, the hub is copper. */
export declare function markSvg(size?: number): SVGSVGElement;
/** The tab shows the showcase's favicon, whatever icon the lab's page declares. */
export declare function applyFavicon(): void;
/**
 * A lab's name as the showcase sets it. The labs wrote theirs in capitals for the former letter-spaced title: a name given once
 * for both languages takes a capital per word (« Piggott Lab »), a bilingual one a French phrase (« Labo du bélier hydraulique »)
 * or an English title (« Hydraulic Ram Lab »). A name already in mixed case is left as written.
 */
export declare function labTitle(title: string | L): string;
