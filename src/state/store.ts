import { batch, computed, signal, type ReadonlySignal, type Signal } from "@preact/signals";
import { MONTH_PRESET } from "../data/designs";
import {
  MAX_DECOR_PER_NAIL,
  naturalDesign,
  normalizeDesign,
  type Decor,
  type Design,
  type Effect,
  type HandKind,
  type Length,
  type Nail,
  type Pattern,
  type Print,
  type Reference,
  type Shape,
  type Tone,
} from "./design";

/** Сколько шагов можно отменить. */
export const HISTORY_LIMIT = 50;

export interface DesignStore {
  design: ReadonlySignal<Design>;
  /** выбранный ноготь 0..4 */
  selected: Signal<number | null>;
  prints: ReadonlySignal<Print[]>;
  reference: ReadonlySignal<Reference | null>;
  canUndo: ReadonlySignal<boolean>;
  canRedo: ReadonlySignal<boolean>;
  apply(fn: (d: Design) => Design, label?: string): void;
  paint(target: number | "all", shade: string | null): void;
  setEffect(target: number | "all", e: Effect): void;
  setPattern(target: number | "all", p: Pattern, accent?: string | null): void;
  addDecor(nail: number, item: string): void;
  moveDecor(nail: number, i: number, patch: Partial<Decor>): void;
  removeDecor(nail: number, i: number): void;
  setShape(s: Shape): void;
  setLength(l: Length): void;
  setHand(h: HandKind): void;
  setTone(t: Tone): void;
  toggleTwoHands(): void;
  load(d: Design): void;
  setPrint(p: Print | null, nail: number): void;
  setReference(r: Reference | null): void;
  undo(): void;
  redo(): void;
  reset(): void;
  /** Конец жеста (отпустили палец/мышь): следующий сдвиг, поворот или размер — уже новый шаг. */
  endGesture(): void;
}

/** Шаг истории: дизайн и то, что живёт только в памяти (принты, референс). */
interface Snapshot {
  design: Design;
  prints: Print[];
  reference: Reference | null;
}

function sameSnapshot(a: Snapshot, b: Snapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function targets(target: number | "all"): number[] {
  return target === "all" ? [0, 1, 2, 3, 4] : [target];
}

function mapNails(d: Design, target: number | "all", fn: (n: Nail, i: number) => Nail): Design {
  const ids = new Set(targets(target));
  return { ...d, nails: d.nails.map((n, i) => (ids.has(i) ? fn(n, i) : n)) as Design["nails"] };
}

/**
 * Хранилище конструктора. Каждое действие — один шаг истории (≤ 50).
 *
 * Жест (перетаскивание, поворот, размер декора или принта) — тоже один шаг:
 * подряд идущие действия с одной меткой `label` склеиваются, пока жест открыт.
 * Жест закрывают `endGesture()` (вызывать на отпускании пальца/мыши), любое другое
 * действие (даже пустое), undo и redo. Без метки действие всегда — отдельный шаг.
 */
export function createDesignStore(initial: Design): DesignStore {
  const current = signal<Snapshot>({ design: normalizeDesign(initial), prints: [], reference: null });
  const past = signal<Snapshot[]>([]);
  const future = signal<Snapshot[]>([]);
  const selected = signal<number | null>(null);
  /** метка открытого жеста; undefined — жеста нет */
  let gesture: string | undefined;

  function commit(next: Snapshot, label?: string): void {
    const prev = current.value;
    const coalesce = label !== undefined && label === gesture && past.value.length > 0;
    if (sameSnapshot(prev, next)) {
      if (label !== gesture) gesture = undefined;
      return;
    }
    gesture = label;
    batch(() => {
      if (!coalesce) past.value = [...past.value, prev].slice(-HISTORY_LIMIT);
      future.value = [];
      current.value = next;
    });
  }

  function apply(fn: (d: Design) => Design, label?: string): void {
    const snap = current.value;
    commit({ ...snap, design: normalizeDesign(fn(snap.design)) }, label);
  }

  return {
    design: computed(() => current.value.design),
    selected,
    prints: computed(() => current.value.prints),
    reference: computed(() => current.value.reference),
    canUndo: computed(() => past.value.length > 0),
    canRedo: computed(() => future.value.length > 0),
    apply,

    paint(target, shade) {
      apply((d) => mapNails(d, target, (n) => ({ ...n, shade })));
    },
    setEffect(target, effect) {
      apply((d) => mapNails(d, target, (n) => ({ ...n, effect })));
    },
    setPattern(target, pattern, accent) {
      apply((d) => mapNails(d, target, (n) => ({ ...n, pattern, accent: accent === undefined ? n.accent : accent })));
    },
    addDecor(nail, item) {
      apply((d) =>
        mapNails(d, nail, (n) =>
          n.decor.length >= MAX_DECOR_PER_NAIL
            ? n
            : { ...n, decor: [...n.decor, { item, u: 0.5, v: 0.35, scale: 1, rot: 0 }] },
        ),
      );
    },
    moveDecor(nail, i, patch) {
      apply(
        (d) => mapNails(d, nail, (n) => ({ ...n, decor: n.decor.map((dec, j) => (j === i ? { ...dec, ...patch } : dec)) })),
        `decor:${nail}:${i}`,
      );
    },
    removeDecor(nail, i) {
      apply((d) => mapNails(d, nail, (n) => ({ ...n, decor: n.decor.filter((_, j) => j !== i) })));
    },
    setShape(shape) {
      apply((d) => ({ ...d, shape }));
    },
    setLength(length) {
      apply((d) => ({ ...d, length }));
    },
    setHand(hand) {
      apply((d) => ({ ...d, hand }));
    },
    setTone(tone) {
      apply((d) => ({ ...d, tone }));
    },
    toggleTwoHands() {
      apply((d) => ({ ...d, twoHands: !d.twoHands }));
    },
    load(d) {
      commit({ design: normalizeDesign(d), prints: [], reference: current.value.reference });
    },
    setPrint(p, nail) {
      const snap = current.value;
      const before = snap.prints.find((x) => x.nail === nail);
      const prints = snap.prints.filter((x) => x.nail !== nail);
      if (p) prints.push({ ...p, nail });
      prints.sort((a, b) => a.nail - b.nail);
      // постановка, замена и снятие принта — отдельный шаг; сдвиг того же принта — жест
      const moving = p !== null && before !== undefined && before.url === p.url;
      commit({ ...snap, prints }, moving ? `print:${nail}` : undefined);
    },
    setReference(reference) {
      commit({ ...current.value, reference });
    },
    undo() {
      const stack = past.value;
      if (stack.length === 0) return;
      batch(() => {
        future.value = [current.value, ...future.value];
        current.value = stack[stack.length - 1];
        past.value = stack.slice(0, -1);
      });
      gesture = undefined;
    },
    redo() {
      const stack = future.value;
      if (stack.length === 0) return;
      batch(() => {
        past.value = [...past.value, current.value].slice(-HISTORY_LIMIT);
        current.value = stack[0];
        future.value = stack.slice(1);
      });
      gesture = undefined;
    },
    reset() {
      const d = current.value.design;
      commit({ design: { ...naturalDesign(d.hand), tone: d.tone, twoHands: d.twoHands }, prints: [], reference: null });
    },
    endGesture() {
      gesture = undefined;
    },
  };
}

/** Единственный экземпляр приложения. Стартует с дизайна месяца (так же, как пререндер). */
export const store: DesignStore = createDesignStore(MONTH_PRESET.design);
