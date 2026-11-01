// Жесты на ногте: перетаскивание декора, сдвиг/масштаб/поворот принта (палец, мышь, два пальца, колесо).
// Каждый жест — один шаг истории: store склеивает сдвиги с одной меткой, конец жеста — store.endGesture().
import type { DesignStore } from "../../state/store";
import { nailFrame } from "../geometry";
import { HANDS } from "../hands";
import { clampPrint } from "./PicturePanel";
import type { ConstructorUi } from "./context";

interface Matrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

/** Точка экрана → координаты элемента SVG (обратная матрица getScreenCTM). */
export function clientToLocal(m: Matrix, x: number, y: number): [number, number] {
  const det = m.a * m.d - m.b * m.c;
  if (!det) return [NaN, NaN];
  const dx = x - m.e;
  const dy = y - m.f;
  return [(m.d * dx - m.c * dy) / det, (-m.b * dx + m.a * dy) / det];
}

/** Точка экрана → (u, v) ногтя i: u поперёк, v от кутикулы к краю. */
export function clientToNail(nailEl: SVGGraphicsElement, s: DesignStore, i: number, x: number, y: number): [number, number] | null {
  const m = nailEl.getScreenCTM?.();
  if (!m) return null;
  const d = s.design.value;
  const [hx, hy] = clientToLocal(m, x, y);
  if (!Number.isFinite(hx) || !Number.isFinite(hy)) return null;
  return nailFrame(HANDS[d.hand].anchors[i], d.length).toLocal(hx, hy);
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

type Drag =
  | { kind: "decor"; nail: number; index: number; el: SVGGraphicsElement }
  | {
      kind: "print";
      nail: number;
      el: SVGGraphicsElement;
      start: { u: number; v: number; x: number; y: number; scale: number; rot: number };
      pinch?: { dist: number; angle: number; scale: number; rot: number; flip: number };
    };

/** Вешает жесты на сцену с рукой. Возвращает отписку. */
export function attachNailGestures(stage: HTMLElement, s: DesignStore, ui: ConstructorUi): () => void {
  let drag: Drag | null = null;
  const pointers = new Map<number, { x: number; y: number }>();
  let wheelTimer: ReturnType<typeof setTimeout> | undefined;

  const nailOf = (target: EventTarget | null): { el: SVGGraphicsElement; i: number } | null => {
    const el = (target as Element | null)?.closest?.("[data-nail]") as SVGGraphicsElement | null;
    if (!el || !stage.contains(el)) return null;
    return { el, i: Number(el.getAttribute("data-nail")) };
  };

  const printOf = (i: number) => s.prints.value.find((p) => p.nail === i);

  const end = () => {
    if (!drag) return;
    drag = null;
    pointers.clear();
    s.endGesture();
  };

  const onDown = (e: PointerEvent) => {
    const hit = nailOf(e.target);
    if (!hit) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const sheet = ui.sheet.value;
    if (drag?.kind === "print" && pointers.size === 2) {
      // второй палец — щипок: масштаб и поворот
      const [p1, p2] = [...pointers.values()];
      const p = printOf(drag.nail);
      if (p) {
        const m = drag.el.getScreenCTM?.();
        const flip = m && m.a * m.d - m.b * m.c < 0 ? -1 : 1;
        drag.pinch = { dist: Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1, angle: Math.atan2(p2.y - p1.y, p2.x - p1.x), scale: p.scale, rot: p.rot, flip };
      }
      return;
    }
    if (drag) return;
    const decorEl = (e.target as Element).closest?.("[data-decor]");
    // пальцем декор двигается в листе «Дизайн» (там прокрутка над рукой выключена), мышью — всегда
    if (decorEl && (sheet === "design" || (e.pointerType === "mouse" && sheet !== "picture"))) {
      e.preventDefault();
      s.selected.value = hit.i;
      drag = { kind: "decor", nail: hit.i, index: Number(decorEl.getAttribute("data-decor")), el: hit.el };
    } else if (sheet === "picture" && printOf(hit.i)) {
      const uv = clientToNail(hit.el, s, hit.i, e.clientX, e.clientY);
      const p = printOf(hit.i)!;
      if (!uv) return;
      e.preventDefault();
      s.selected.value = hit.i;
      drag = { kind: "print", nail: hit.i, el: hit.el, start: { u: uv[0], v: uv[1], x: p.x, y: p.y, scale: p.scale, rot: p.rot } };
    } else {
      pointers.delete(e.pointerId);
      return;
    }
    try {
      stage.setPointerCapture(e.pointerId);
    } catch {
      // синтетические события без захвата — не страшно
    }
  };

  const onMove = (e: PointerEvent) => {
    if (!drag || !pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.preventDefault();
    if (drag.kind === "decor") {
      const uv = clientToNail(drag.el, s, drag.nail, e.clientX, e.clientY);
      if (!uv) return;
      s.moveDecor(drag.nail, drag.index, { u: clamp01(uv[0]), v: clamp01(uv[1]) });
      return;
    }
    const p = printOf(drag.nail);
    if (!p) return;
    if (drag.pinch && pointers.size >= 2) {
      const [p1, p2] = [...pointers.values()];
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const { pinch } = drag;
      s.setPrint(
        clampPrint({ ...p, scale: pinch.scale * (dist / pinch.dist), rot: pinch.rot + pinch.flip * ((angle - pinch.angle) * 180) / Math.PI }),
        drag.nail,
      );
      return;
    }
    const uv = clientToNail(drag.el, s, drag.nail, e.clientX, e.clientY);
    if (!uv) return;
    const { start } = drag;
    s.setPrint(clampPrint({ ...p, x: start.x + uv[0] - start.u, y: start.y + uv[1] - start.v }), drag.nail);
  };

  const onUp = (e: PointerEvent) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (drag?.kind === "print" && drag.pinch && pointers.size === 1) {
      // отпустили один палец из двух — щипок закончен, продолжаем сдвиг от текущего места
      s.endGesture();
      const p = printOf(drag.nail);
      const [rest] = [...pointers.values()];
      const uv = p && rest ? clientToNail(drag.el, s, drag.nail, rest.x, rest.y) : null;
      if (p && uv) drag = { ...drag, pinch: undefined, start: { u: uv[0], v: uv[1], x: p.x, y: p.y, scale: p.scale, rot: p.rot } };
      return;
    }
    if (pointers.size === 0) end();
  };

  const onWheel = (e: WheelEvent) => {
    if (ui.sheet.value !== "picture") return;
    const hit = nailOf(e.target);
    if (!hit) return;
    const p = printOf(hit.i);
    if (!p) return;
    e.preventDefault();
    s.selected.value = hit.i;
    const next = e.shiftKey ? { ...p, rot: p.rot + e.deltaY * 0.25 } : { ...p, scale: p.scale * Math.exp(-e.deltaY * 0.0015) };
    s.setPrint(clampPrint(next), hit.i);
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => s.endGesture(), 300);
  };

  stage.addEventListener("pointerdown", onDown);
  stage.addEventListener("pointermove", onMove);
  stage.addEventListener("pointerup", onUp);
  stage.addEventListener("pointercancel", onUp);
  stage.addEventListener("wheel", onWheel, { passive: false });
  return () => {
    clearTimeout(wheelTimer);
    stage.removeEventListener("pointerdown", onDown);
    stage.removeEventListener("pointermove", onMove);
    stage.removeEventListener("pointerup", onUp);
    stage.removeEventListener("pointercancel", onUp);
    stage.removeEventListener("wheel", onWheel);
  };
}
