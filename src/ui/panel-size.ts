import { onLangChange, t } from '../i18n';
import { fill, h, icon, ICONS } from './dom';

// Desktop side panel sizing: drag its left edge to widen it next to the 3D view (double-click
// resets), or switch to a full-width reading mode. The width is remembered in this browser only.

const MIN = 300;
/** Part of the 3D view kept while dragging (the CSS clamps the same way on window resize). */
const VIEW_MIN = 320;

function load(key: string): number | null {
  try {
    const w = Number(localStorage.getItem(key));
    return w >= MIN ? w : null;
  } catch {
    return null;
  }
}

function save(key: string, w: number | null): void {
  try {
    if (w === null) localStorage.removeItem(key);
    else localStorage.setItem(key, String(Math.round(w)));
  } catch {
    // storage unavailable (private window, blocked site data): the width just isn't kept
  }
}

function apply(w: number | null): void {
  const root = document.documentElement;
  if (w === null) root.style.removeProperty('--panel-w');
  else root.style.setProperty('--panel-w', `${Math.round(w)}px`);
}

/** Left edge of the side panel: resize handle + "reading mode" button. */
export function panelEdge(labId: string): HTMLElement {
  const key = `${labId}.panelWidth`;
  const wideBtn = h('button', { class: 'panel__wide', type: 'button' });
  const edge = h('div', { class: 'panel__edge' }, wideBtn);
  const wide = () => document.body.classList.contains('panel-wide');
  const render = () => {
    fill(wideBtn, icon(wide() ? ICONS.next : ICONS.prev, 14));
    const label = t(wide() ? 'panelNarrow' : 'panelWide');
    wideBtn.setAttribute('aria-label', label);
    wideBtn.title = label;
    edge.title = t('panelResize');
  };
  const setWide = (on: boolean) => {
    document.body.classList.toggle('panel-wide', on);
    render();
  };

  apply(load(key));
  render();
  onLangChange(render);

  wideBtn.addEventListener('click', () => setWide(!wide()));
  edge.addEventListener('dblclick', (e) => {
    if (e.target !== edge) return;
    apply(null);
    save(key, null);
  });
  edge.addEventListener('pointerdown', (e) => {
    if (e.target !== edge || e.button !== 0) return;
    e.preventDefault();
    setWide(false);
    edge.setPointerCapture(e.pointerId);
    document.body.classList.add('panel-resizing');
    let w: number | null = null;
    const move = (ev: PointerEvent) => {
      const rail = document.querySelector('.rail')?.getBoundingClientRect().width ?? 0;
      const max = Math.max(MIN, window.innerWidth - rail - VIEW_MIN);
      w = Math.min(max, Math.max(MIN, window.innerWidth - ev.clientX));
      apply(w);
    };
    const up = () => {
      edge.removeEventListener('pointermove', move);
      document.body.classList.remove('panel-resizing');
      if (w !== null) save(key, w);
    };
    edge.addEventListener('pointermove', move);
    edge.addEventListener('pointerup', up, { once: true });
    edge.addEventListener('pointercancel', up, { once: true });
  });
  return edge;
}
