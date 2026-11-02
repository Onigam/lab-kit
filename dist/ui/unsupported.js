import { enTypo, frTypo, getLang, strL } from '../i18n';
import { h } from './dom';
// What the visitor sees when the browser has no WebGL: a short message in the frame's style, in both languages,
// instead of an empty page.
/** True when a WebGL 2 context can be created in this browser (three.js needs WebGL 2). */
export function webglAvailable() {
    try {
        const gl = document.createElement('canvas').getContext('webgl2');
        gl?.getExtension('WEBGL_lose_context')?.loseContext();
        return !!gl;
    }
    catch {
        return false;
    }
}
/** Replace the content of the application root with the "no WebGL" message (current language first). */
export function showUnsupported(app) {
    const order = getLang() === 'fr' ? ['fr', 'en'] : ['en', 'fr'];
    const text = (key, lang) => (lang === 'fr' ? frTypo(strL(key).fr) : enTypo(strL(key).en));
    app.replaceChildren(h('main', { class: 'unsupported', role: 'alert' }, ...order.map((lang, i) => h('section', { class: `unsupported__card${i ? ' unsupported__card--alt' : ''}`, lang }, h('div', { class: 'eyebrow eyebrow--accent' }, i ? 'WebGL · ' + lang.toUpperCase() : 'WebGL'), h('h2', { class: 'panel-title' }, text('webglTitle', lang)), h('p', { class: 'lead' }, text('webglBody', lang)), h('p', { class: 'hint' }, text('webglHelp', lang))))));
}
