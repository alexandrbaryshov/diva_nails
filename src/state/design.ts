// Модель дизайна маникюра. Всё, что здесь есть, попадает в ссылку #d=… (кроме Print и Reference).
import { shadeById } from "../data/palette";

export type HandKind = "her" | "his";
export type Tone = 0 | 1 | 2 | 3;
export type Shape = "square" | "soft-square" | "oval" | "almond" | "ballerina" | "stiletto";
export type Length = "short" | "medium" | "long" | "extra";
export type Effect = "gloss" | "matte" | "chrome" | "rub" | "cat-eye" | "glitter" | "gradient";
export type Pattern = "none" | "french" | "lunar" | "ombre" | "marble" | "dots" | "stripes" | "hearts";

/** Декор на ногте. u — поперёк ногтя, v — от кутикулы (0) к свободному краю (1). */
export interface Decor {
  item: string;
  u: number;
  v: number;
  scale: number;
  rot: number;
}

export interface Nail {
  /** id оттенка; null — натуральный ноготь без покрытия */
  shade: string | null;
  effect: Effect;
  pattern: Pattern;
  /** второй оттенок для french/lunar/ombre/gradient/…; null — по умолчанию узора */
  accent: string | null;
  decor: Decor[];
}

export interface Design {
  v: 1;
  hand: HandKind;
  tone: Tone;
  twoHands: boolean;
  shape: Shape;
  length: Length;
  /** большой → мизинец */
  nails: [Nail, Nail, Nail, Nail, Nail];
}

// Только в памяти, не в ссылке:
export interface Print {
  nail: number;
  url: string;
  x: number;
  y: number;
  scale: number;
  rot: number;
}
export interface Reference {
  url: string;
}

// Порядок значений в списках ниже — часть формата ссылки v1: не переставлять, только дописывать в конец.
export const HANDS: readonly HandKind[] = ["her", "his"];
export const TONES: readonly Tone[] = [0, 1, 2, 3];
export const SHAPES: readonly Shape[] = ["square", "soft-square", "oval", "almond", "ballerina", "stiletto"];
export const LENGTHS: readonly Length[] = ["short", "medium", "long", "extra"];
export const EFFECTS: readonly Effect[] = ["gloss", "matte", "chrome", "rub", "cat-eye", "glitter", "gradient"];
export const PATTERNS: readonly Pattern[] = ["none", "french", "lunar", "ombre", "marble", "dots", "stripes", "hearts"];

/** Мужская рука: только короткие формы и короткая длина. */
export const HIS_SHAPES: readonly Shape[] = ["square", "soft-square", "oval"];
export const HIS_LENGTHS: readonly Length[] = ["short"];
/** Мужской набор: без покрытия, матовое укрепление, прозрачный глянец, чёрный мат. */
export const HIS_EFFECTS: readonly Effect[] = ["gloss", "matte"];

/** Не больше трёх элементов декора на ноготь (так ссылка всегда ≤ 120 символов). */
export const MAX_DECOR_PER_NAIL = 3;
/** Сетка координат декора: 16 клеток, u и v — центры клеток (k + 0.5) / 16. */
export const DECOR_CELLS = 16;
/** Допустимые размеры декора. */
export const DECOR_SCALES: readonly number[] = [0.75, 1, 1.25, 1.5];
/** Шаг поворота декора, градусы (8 положений: 0, 45, …, 315). */
export const DECOR_ROT_STEP = 45;

/** Куда уходит женская форма на мужской руке. */
const HIS_SHAPE_FALLBACK: Record<Shape, Shape> = {
  square: "square",
  "soft-square": "soft-square",
  oval: "oval",
  almond: "oval",
  ballerina: "soft-square",
  stiletto: "oval",
};

export function naturalNail(): Nail {
  return { shade: null, effect: "gloss", pattern: "none", accent: null, decor: [] };
}

export function naturalDesign(hand: HandKind = "her"): Design {
  return {
    v: 1,
    hand,
    tone: 1,
    twoHands: false,
    shape: hand === "his" ? "soft-square" : "oval",
    length: "short",
    nails: [naturalNail(), naturalNail(), naturalNail(), naturalNail(), naturalNail()],
  };
}

/** long | extra → «Это наращивание» */
export function isLongLength(l: Length): boolean {
  return l === "long" || l === "extra";
}

/** Мужская рука — только короткое и мужской набор. Женская рука не меняется. */
export function clampForHand(d: Design): Design {
  if (d.hand !== "his") return d;
  const nails = d.nails.map((n): Nail => {
    const s = n.shade === null ? undefined : shadeById(n.shade);
    const his = s?.forHis ? s : undefined;
    const effect = his?.effect ?? (HIS_EFFECTS.includes(n.effect) ? n.effect : "gloss");
    return { shade: his ? his.id : null, effect, pattern: "none", accent: null, decor: [] };
  }) as Design["nails"];
  return {
    ...d,
    shape: HIS_SHAPES.includes(d.shape) ? d.shape : HIS_SHAPE_FALLBACK[d.shape],
    length: HIS_LENGTHS.includes(d.length) ? d.length : "short",
    nails,
  };
}

function nearestOf(value: number, options: readonly number[]): number {
  let best = options[0];
  for (const o of options) if (Math.abs(o - value) < Math.abs(best - value)) best = o;
  return best;
}

/** Координата на сетке декора: центр ближайшей клетки. */
export function snapDecorCoord(x: number): number {
  const k = Math.min(DECOR_CELLS - 1, Math.max(0, Math.floor((Number.isFinite(x) ? x : 0.5) * DECOR_CELLS)));
  return (k + 0.5) / DECOR_CELLS;
}

/** Декор на сетке ссылки: координаты по клеткам, размер из DECOR_SCALES, поворот шагом 45°. */
export function snapDecor(dec: Decor): Decor {
  const steps = 360 / DECOR_ROT_STEP;
  const rotStep = ((Math.round((Number.isFinite(dec.rot) ? dec.rot : 0) / DECOR_ROT_STEP) % steps) + steps) % steps;
  return {
    item: dec.item,
    u: snapDecorCoord(dec.u),
    v: snapDecorCoord(dec.v),
    scale: nearestOf(Number.isFinite(dec.scale) ? dec.scale : 1, DECOR_SCALES),
    rot: rotStep * DECOR_ROT_STEP,
  };
}

/** Приводит дизайн к допустимым значениям: декор на сетке, не больше трёх на ноготь, ограничения руки. */
export function normalizeDesign(d: Design): Design {
  const nails = d.nails.map(
    (n): Nail => ({
      shade: n.shade,
      effect: n.effect,
      pattern: n.pattern,
      accent: n.accent,
      decor: n.decor.slice(0, MAX_DECOR_PER_NAIL).map(snapDecor),
    }),
  ) as Design["nails"];
  return clampForHand({
    v: 1,
    hand: d.hand,
    tone: d.tone,
    twoHands: d.twoHands,
    shape: d.shape,
    length: d.length,
    nails,
  });
}
