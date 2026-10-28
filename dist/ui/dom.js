// Minimal DOM helpers: no framework, just typed element builders.
export function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (v === undefined || v === false)
            continue;
        if (k.startsWith('on') && typeof v === 'function') {
            el.addEventListener(k.slice(2).toLowerCase(), v);
        }
        else if (k === 'class') {
            el.className = String(v);
        }
        else if (v === true) {
            el.setAttribute(k, '');
        }
        else {
            el.setAttribute(k, String(v));
        }
    }
    append(el, children);
    return el;
}
export function append(el, children) {
    for (const c of children) {
        if (c === null || c === undefined || c === false)
            continue;
        el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
}
/**
 * Render trusted bilingual content that may contain **bold** markers.
 * Text is inserted with text nodes only (no innerHTML).
 */
export function rich(text) {
    const frag = document.createDocumentFragment();
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    for (const p of parts) {
        if (p.startsWith('**') && p.endsWith('**')) {
            const b = document.createElement('strong');
            b.textContent = p.slice(2, -2);
            frag.append(b);
        }
        else if (p) {
            frag.append(document.createTextNode(p));
        }
    }
    return frag;
}
/** Render a text that may hold several paragraphs (a blank line starts a new one), each with **bold** markers. */
export function paragraphs(text, cls) {
    return text.split(/\n\s*\n/).map((para) => h('p', cls ? { class: cls } : {}, rich(para)));
}
/**
 * Tell the stylesheet where a scrolling element has more to show. Sets `--fade-start` and `--fade-end` on `el` (how much
 * to fade at each edge where its content goes on) and `data-more="start end"` on `host` (default `el`), so a scroller
 * without a visible scrollbar (the phone rail and toolbar) can show an arrow and a fade at its cut edge.
 */
export function watchOverflow(el, host = el, fade = 22) {
    const update = () => {
        const x = el.scrollWidth - el.clientWidth;
        const y = el.scrollHeight - el.clientHeight;
        const horizontal = x >= y;
        const max = horizontal ? x : y;
        const pos = horizontal ? el.scrollLeft : el.scrollTop;
        const start = max > 2 && pos > 2;
        const end = max > 2 && pos < max - 2;
        el.style.setProperty('--fade-start', start ? `${fade}px` : '0px');
        el.style.setProperty('--fade-end', end ? `${fade}px` : '0px');
        host.dataset.more = [start ? 'start' : '', end ? 'end' : ''].join(' ').trim();
    };
    el.addEventListener('scroll', update, { passive: true });
    new ResizeObserver(update).observe(el);
    new MutationObserver(update).observe(el, { childList: true, subtree: true, characterData: true });
    void document.fonts?.ready.then(update);
    update();
}
/** Replace the children of `el`, skipping null/false entries. */
export function fill(el, ...children) {
    el.replaceChildren();
    append(el, children);
}
export function clear(el) {
    while (el.firstChild)
        el.removeChild(el.firstChild);
}
/** Inline SVG icon from a path list (24×24, stroke icons). */
export function icon(paths, size = 20) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.7');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    for (const d of paths.split('|')) {
        const p = document.createElementNS(ns, 'path');
        p.setAttribute('d', d);
        svg.append(p);
    }
    return svg;
}
export const ICONS = {
    explore: 'M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z|M12 12l8-4.5|M12 12v9|M12 12L4 7.5',
    assembly: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4 2.5-2.5z',
    install: 'M3 20l5-10 4 6 3-4 6 8z|M15 7a2 2 0 1 0 0-.01',
    sim: 'M4 18a8 8 0 1 1 16 0|M12 18l4-6|M4 18h16',
    plans: 'M3 5h18v14H3z|M3 15h18|M14 15v4|M7 8h6|M7 11h3|M16 8l2 2-2 2',
    download: 'M12 4v11|M7 10l5 5 5-5|M5 19h14',
    print: 'M7 9V4h10v5|M5 9h14v7H5z|M8 14h8v6H8z',
    lessons: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z|M4 19V5|M9 7h6',
    parts: 'M4 6h16|M4 12h16|M4 18h10',
    about: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M12 11v6|M12 7.5v.01',
    prev: 'M15 6l-6 6 6 6',
    next: 'M9 6l6 6-6 6',
    play: 'M7 5l12 7-12 7z',
    pause: 'M8 5v14|M16 5v14',
    home: 'M3 11l9-7 9 7|M5 10v10h14V10',
    close: 'M6 6l12 12|M18 6L6 18',
    video: 'M3 6h12v12H3z|M15 10l6-3v10l-6-3',
    focus: 'M4 9V4h5|M20 9V4h-5|M4 15v5h5|M20 15v5h-5|M12 12v.01',
    isolate: 'M12 3l8 4.5v9L12 21l-8-4.5v-9z',
    reset: 'M4 4v6h6|M4.5 15a8 8 0 1 0 1.9-8.3L4 10',
    chevron: 'M6 9l6 6 6-6',
    bolt: 'M13 3L5 14h6l-1 7 8-11h-6z',
    drop: 'M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z',
    sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M12 2v2|M12 20v2|M4.9 4.9l1.4 1.4|M17.7 17.7l1.4 1.4|M2 12h2|M20 12h2|M4.9 19.1l1.4-1.4|M17.7 6.3l1.4-1.4',
    warn: 'M12 4l9 16H3z|M12 10v4|M12 17v.01',
    ok: 'M5 12l4 4 10-10',
    menu: 'M4 7h16|M4 12h16|M4 17h16',
};
