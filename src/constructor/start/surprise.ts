// «Удиви меня»: случайный, но гармоничный дизайн только из палитры студии.
// Правило гармонии: база на трёх и больше ногтях + до двух акцентов одной семьи.
import type { Shade } from "../../data/palette";
import {
  HIS_SHAPES,
  SHAPES,
  naturalDesign,
  normalizeDesign,
  type Design,
  type Effect,
  type HandKind,
  type Length,
  type Nail,
  type Pattern,
} from "../../state/design";

type Rng = () => number;

function pick<T>(rng: Rng, list: readonly T[]): T {
  const i = Math.floor(rng() * list.length);
  return list[Math.min(list.length - 1, Math.max(0, i))];
}

/** Перемешанная копия (Фишер — Йейтс). */
function shuffle<T>(rng: Rng, list: readonly T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const BASE_EFFECTS: readonly Effect[] = ["gloss", "gloss", "gloss", "matte", "chrome", "cat-eye"];
const ACCENT_EFFECTS: readonly Effect[] = ["gloss", "chrome", "cat-eye", "glitter", "rub"];
const BASE_PATTERNS: readonly Pattern[] = ["french", "lunar", "ombre"];
const ACCENT_PATTERNS: readonly Pattern[] = ["none", "none", "dots", "stripes", "marble", "french"];
const HER_LENGTHS: readonly Length[] = ["short", "medium", "medium", "long"];

function nail(shade: string | null, effect: Effect, pattern: Pattern = "none", accent: string | null = null): Nail {
  return { shade, effect, pattern, accent, decor: [] };
}

function herDesign(rng: Rng, pool: readonly Shade[]): Design {
  const base = pick(rng, pool);
  const others = pool.filter((s) => s.id !== base.id);
  // семья акцентов — любая из палитры, акценты внутри неё
  const families = [...new Set(others.map((s) => s.family))];
  const family = families.length ? pick(rng, families) : base.family;
  const accents = shuffle(
    rng,
    others.filter((s) => s.family === family),
  ).slice(0, 2);
  const [a1, a2] = accents;

  const baseEffect = pick(rng, BASE_EFFECTS);
  const nails: Nail[] = [0, 1, 2, 3, 4].map(() => nail(base.id, baseEffect));
  const style = a1 ? Math.floor(rng() * 4) : 0;
  if (style === 1 && a1) {
    // акцентный безымянный
    nails[3] = nail(a1.id, pick(rng, ACCENT_EFFECTS), pick(rng, ACCENT_PATTERNS), a2?.id ?? null);
  } else if (style === 2 && a1) {
    // два акцента: безымянный и указательный
    nails[3] = nail(a1.id, pick(rng, ACCENT_EFFECTS));
    nails[1] = nail((a2 ?? a1).id, pick(rng, ACCENT_EFFECTS));
  } else if (style === 3 && a1) {
    // узор акцентным оттенком на всех ногтях, безымянный — вторым акцентом
    const pattern = pick(rng, BASE_PATTERNS);
    for (let i = 0; i < 5; i++) nails[i] = nail(base.id, baseEffect, pattern, a1.id);
    if (a2) nails[3] = nail(a2.id, pick(rng, ACCENT_EFFECTS));
  }
  // иногда — страза на безымянном
  if (rng() < 0.25) nails[3] = { ...nails[3], decor: [{ item: "rhinestone-crystal", u: 0.5, v: 0.3, scale: 1, rot: 0 }] };

  return {
    ...naturalDesign("her"),
    shape: pick(rng, SHAPES),
    length: pick(rng, HER_LENGTHS),
    nails: nails as Design["nails"],
  };
}

function hisDesign(rng: Rng, pool: readonly Shade[]): Design {
  const base = pick(rng, pool);
  const effectOf = (s: Shade): Effect => s.effect ?? pick(rng, ["gloss", "matte"] as const);
  const nails: Nail[] = [0, 1, 2, 3, 4].map(() => nail(base.id, effectOf(base)));
  const others = pool.filter((s) => s.id !== base.id);
  if (others.length && rng() < 0.3) {
    const accent = pick(rng, others);
    nails[3] = nail(accent.id, effectOf(accent));
  }
  return { ...naturalDesign("his"), shape: pick(rng, HIS_SHAPES), length: "short", nails: nails as Design["nails"] };
}

/**
 * Случайный гармоничный дизайн. shades — палитра, из которой брать (её — HER_SHADES, его — HIS_SHADES).
 * Тон кожи и вторую руку вызывающий подставляет свои.
 */
export function surprise(rng: () => number, shades: readonly Shade[], hand: HandKind): Design {
  if (shades.length === 0) return naturalDesign(hand);
  return normalizeDesign(hand === "his" ? hisDesign(rng, shades) : herDesign(rng, shades));
}

/** Ключ сравнения: то, что видно на ногтях (без тона и второй руки). */
function lookKey(d: Design): string {
  return JSON.stringify([d.hand, d.shape, d.length, d.nails]);
}

/** «Удиви меня» ещё раз: гарантированно не то же самое, что сейчас на руке. */
export function surpriseDifferent(rng: () => number, shades: readonly Shade[], hand: HandKind, previous: Design): Design {
  const prev = lookKey(previous);
  let d = surprise(rng, shades, hand);
  for (let i = 0; i < 8 && lookKey(d) === prev; i++) d = surprise(rng, shades, hand);
  if (lookKey(d) !== prev || shades.length === 0) return d;
  // упрямый генератор: сдвигаем базовый оттенок на следующий в палитре, а если он один — форму
  const base = d.nails[2].shade;
  const at = shades.findIndex((s) => s.id === base);
  if (shades.length > 1 && at >= 0) {
    const next = shades[(at + 1) % shades.length];
    return normalizeDesign({
      ...d,
      nails: d.nails.map((n) => (n.shade === base ? { ...n, shade: next.id, effect: next.effect ?? n.effect } : n)) as Design["nails"],
    });
  }
  const shapes = hand === "his" ? HIS_SHAPES : SHAPES;
  return normalizeDesign({ ...d, shape: shapes[(shapes.indexOf(d.shape) + 1) % shapes.length] });
}
