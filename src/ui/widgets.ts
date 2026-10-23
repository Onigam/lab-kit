import { h } from './dom';

// Form widgets shared by the lab panels (simulation controls): labelled slider, select,
// checkbox toggle and collapsible section. Labels are passed already translated.

export function slider(
  label: string,
  value: number,
  min: number,
  max: number,
  step: number,
  fmt: (v: number) => string,
  on: (v: number) => void,
): HTMLElement {
  const out = h('output', {}, fmt(value));
  return h(
    'label',
    { class: 'field' },
    h('span', { class: 'field__label' }, label, out),
    h('input', {
      type: 'range',
      min,
      max,
      step,
      value,
      oninput: (ev: Event) => {
        const v = Number((ev.target as HTMLInputElement).value);
        out.textContent = fmt(v);
        on(v);
      },
    }),
  );
}

export function select<T extends string | number>(
  label: string,
  value: T,
  options: [T, string][],
  on: (v: T) => void,
): HTMLElement {
  return h(
    'label',
    { class: 'field' },
    h('span', { class: 'field__label' }, label),
    h(
      'select',
      {
        onchange: (ev: Event) => {
          const raw = (ev.target as HTMLSelectElement).value;
          on((typeof value === 'number' ? Number(raw) : raw) as T);
        },
      },
      ...options.map(([v, text]) => h('option', { value: String(v), selected: v === value }, text)),
    ),
  );
}

export function toggle(label: string, checked: boolean, on: (v: boolean) => void): HTMLElement {
  return h(
    'label',
    { class: 'toggle' },
    h('input', { type: 'checkbox', checked, onchange: (ev: Event) => on((ev.target as HTMLInputElement).checked) }),
    label,
  );
}

export function section(title: string, ...children: (HTMLElement | null)[]): HTMLElement {
  return h(
    'details',
    { class: 'sim-section', open: true },
    h('summary', {}, title),
    h('div', { class: 'sim-grid' }, ...children),
  );
}
