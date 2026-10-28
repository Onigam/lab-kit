// The bottom sheet of a phone: a tap on its grip opens or closes it, a drag on the grip carries it with the finger
// and lets it settle open or closed (a fast flick counts).
/** Pixels of finger travel before a press on the grip counts as a drag rather than a tap. */
const SLOP = 6;
export function bindSheetDrag({ panel, grip, isOpen, setOpen }) {
    const body = document.body;
    let start = null;
    let dragging = false;
    let off = 0;
    let last = { y: 0, t: 0 };
    let velocity = 0; // px per ms, positive = moving down
    let ignoreClickUntil = 0;
    const finish = (settle) => {
        if (!start)
            return;
        const max = start.max;
        start = null;
        if (!dragging)
            return;
        dragging = false;
        ignoreClickUntil = performance.now() + 400; // the click that follows the release is not a tap
        // a flick decides; otherwise the nearer rest position
        const open = settle ? (Math.abs(velocity) > 0.45 ? velocity < 0 : off < max / 2) : isOpen();
        body.classList.remove('sheet-dragging');
        body.style.removeProperty('--sheet-off');
        setOpen(open);
    };
    grip.addEventListener('pointerdown', (e) => {
        if (e.button !== 0)
            return;
        // the distance between the open and the closed positions: the sheet's height minus its grip
        const max = Math.max(0, panel.offsetHeight - grip.offsetHeight);
        start = { id: e.pointerId, y: e.clientY, off: isOpen() ? 0 : max, max };
        off = start.off;
        last = { y: e.clientY, t: performance.now() };
        velocity = 0;
        dragging = false;
    });
    grip.addEventListener('pointermove', (e) => {
        if (!start || e.pointerId !== start.id)
            return;
        const dy = e.clientY - start.y;
        if (!dragging) {
            if (Math.abs(dy) < SLOP)
                return;
            dragging = true;
            grip.setPointerCapture(e.pointerId);
            body.classList.add('sheet-dragging');
        }
        const now = performance.now();
        if (now > last.t)
            velocity = 0.6 * velocity + 0.4 * ((e.clientY - last.y) / (now - last.t));
        last = { y: e.clientY, t: now };
        off = Math.min(start.max, Math.max(0, start.off + dy));
        body.style.setProperty('--sheet-off', `${off}px`);
        e.preventDefault();
    });
    grip.addEventListener('pointerup', (e) => start && e.pointerId === start.id && finish(true));
    grip.addEventListener('pointercancel', (e) => start && e.pointerId === start.id && finish(true));
    grip.addEventListener('click', () => {
        if (performance.now() < ignoreClickUntil)
            return;
        setOpen(!isOpen());
    });
}
