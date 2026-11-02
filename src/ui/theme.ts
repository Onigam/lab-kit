// Light or dark, as on the showcase: the system's setting by default, the visitor's choice once made. Only the frame changes: the
// 3D worlds and the A3 sheets keep their own colours in both.

const KEY = 'onigam-labs:theme';
const listeners = new Set<() => void>();

const system = (): MediaQueryList | null =>
  typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;

const notify = (): void => listeners.forEach((fn) => fn());

/** Apply the visitor's earlier choice and follow the system's setting. Call once, before the application is drawn. */
export function initTheme(): void {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved;
  } catch {
    /* storage can be blocked: the choice then lasts for the visit only */
  }
  system()?.addEventListener('change', notify);
}

export function isDark(): boolean {
  if (typeof document === 'undefined') return false;
  const chosen = document.documentElement.dataset.theme;
  return chosen ? chosen === 'dark' : !!system()?.matches;
}

export function toggleTheme(): void {
  const next = isDark() ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* see above */
  }
  notify();
}

export function onThemeChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
