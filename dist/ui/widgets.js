import { h } from './dom';
// Form widgets shared by the lab panels (simulation controls): labelled slider, select,
// checkbox toggle and collapsible section. Labels are passed already translated.
export function slider(label, value, min, max, step, fmt, on) {
    const out = h('output', {}, fmt(value));
    return h('label', { class: 'field' }, h('span', { class: 'field__label' }, label, out), h('input', {
        type: 'range',
        min,
        max,
        step,
        value,
        oninput: (ev) => {
            const v = Number(ev.target.value);
            out.textContent = fmt(v);
            on(v);
        },
    }));
}
export function select(label, value, options, on) {
    return h('label', { class: 'field' }, h('span', { class: 'field__label' }, label), h('select', {
        onchange: (ev) => {
            const raw = ev.target.value;
            on((typeof value === 'number' ? Number(raw) : raw));
        },
    }, ...options.map(([v, text]) => h('option', { value: String(v), selected: v === value }, text))));
}
export function toggle(label, checked, on) {
    return h('label', { class: 'toggle' }, h('input', { type: 'checkbox', checked, onchange: (ev) => on(ev.target.checked) }), label);
}
export function section(title, ...children) {
    return h('details', { class: 'sim-section', open: true }, h('summary', {}, title), h('div', { class: 'sim-grid' }, ...children));
}
