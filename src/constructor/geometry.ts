// Геометрия ногтя: контур из формы и длины, и рамка координат ногтя (u поперёк, v от кутикулы к краю).
// Всё — чистые функции в координатах viewBox руки (см. NailAnchor в hands.ts).
import type { Length, Shape } from "../state/design";
import type { NailAnchor } from "./hands";

type Pt = [number, number];

// Контур по утверждённому макету (comp-1.png): ногти дизайна месяца замерены по пикселям
// (scripts/hands/comp_nails.py), и «овал / короткие» подогнан к ним — ошибка ширины ≈ 1.5 px макета.
/** Скругление у кутикулы: глубина дуги, доля ширины (ноготь скруглён и у кутикулы, не срезан). */
const CAP = 0.754;
/** Ручки дуги кутикулы: у вершины — доля полуширины, у боковой точки — доля глубины дуги. */
const CAP_A = 1;
const CAP_B = 0.244;
/** Кончик овала: глубина, доля ширины, и ручки кривой (вдоль бока — доля глубины, у вершины — доля полуширины). */
const OVAL_TIP = 1.195;
const OVAL_A = 0.428;
const OVAL_B = 0.846;
/** Насколько ноготь расширяется к свободному краю, доля ширины. */
const FLARE = 0.03;
/** Свободный край по форме при короткой длине, доля ширины: заострённым формам нужен свой кончик. */
const TIP: Record<Shape, number> = {
  square: 0.06,
  "soft-square": 0.1,
  oval: 0.3,
  almond: 0.5,
  ballerina: 0.34,
  stiletto: 0.62,
};
/** Сколько добавляет длина поверх кончика формы, доля ширины. */
const EXT: Record<Length, number> = { short: 0, medium: 0.42, long: 0.9, extra: 1.45 };
/** Рамка координат ногтя меряется по овалу: декор и принт не прыгают при смене формы. */
const FRAME_TIP = TIP.oval;
/** Константа кубической дуги четверти эллипса. */
const K = 0.5523;

function axes(a: NailAnchor): { e1: Pt; e2: Pt } {
  const r = (a.angle * Math.PI) / 180;
  return { e1: [Math.sin(r), -Math.cos(r)], e2: [Math.cos(r), Math.sin(r)] };
}

/** Полная длина ногтя от кутикулы до свободного края. */
export function nailLength(shape: Shape, length: Length, a: NailAnchor): number {
  return a.bed + a.width * (TIP[shape] + EXT[length]);
}

/** Длина рамки координат ногтя (v = 1). */
export function frameLength(a: NailAnchor, length: Length): number {
  return a.bed + a.width * (FRAME_TIP + EXT[length]);
}

/** Глубина кончика по форме, единицы руки: F — свободный край (длина за подушечкой). */
function tipDepth(shape: Shape, w: number, F: number): number {
  switch (shape) {
    case "square":
      return 0.05 * w;
    case "soft-square":
      return 0.24 * w;
    case "oval":
      return OVAL_TIP * w;
    case "almond":
      return 0.45 * w + 0.6 * F;
    case "stiletto":
      return 0.5 * w + 0.7 * F;
    case "ballerina":
      return 0.25 * w + 0.75 * F;
  }
}

/**
 * Сужение ногтя к свободному краю, если палец виден сбоку (большой палец макета): множитель ширины
 * на расстоянии t от кутикулы. Без `taper` у якоря — 1.
 */
export function taperAt(a: NailAnchor, L: number, t: number): number {
  const k = a.taper ?? 0;
  if (!k) return 1;
  const f = Math.min(1, Math.max(0, t / L));
  return 1 - k * f * f;
}

/** Кубическая кривая: начало, две ручки, конец. */
type Cubic = [Pt, Pt, Pt, Pt];

const line = (p: Pt, q: Pt): Cubic => [p, [p[0] + (q[0] - p[0]) / 3, p[1] + (q[1] - p[1]) / 3], [p[0] + ((q[0] - p[0]) * 2) / 3, p[1] + ((q[1] - p[1]) * 2) / 3], q];

/**
 * Профиль ногтя в его осях: s — поперёк (−w/2…w/2), t — вдоль от кутикулы.
 * Правая половина от вершины дуги кутикулы (0, 0) до вершины кончика (0, L) — кубическими кривыми
 * (прямые бока — тоже кривыми, чтобы сужение `taper` гнуло их плавно); левая — её зеркало.
 */
function profile(shape: Shape, length: Length, a: NailAnchor): Cubic[] {
  const w = a.width;
  const h = w / 2;
  const L = nailLength(shape, length, a);
  const F = L - a.bed; // свободный край
  const h1 = h * (1 + FLARE + (F / w) * 0.02); // у края чуть шире ложа
  let c = (a.cap ?? CAP) * w;
  let k = tipDepth(shape, w, F);
  // короткий ноготь короче двух скруглений — оба ужимаются пропорционально
  const room = L * 0.98;
  if (c + k > room) {
    const f = room / (c + k);
    c *= f;
    k *= f;
  }
  const T = L - k;
  const right: Cubic[] = [[[0, 0], [CAP_A * h, 0], [h, c * (1 - CAP_B)], [h, c]], line([h, c], [h1, T])];

  switch (shape) {
    case "square":
    case "soft-square": {
      const r = k;
      right.push([[h1, T], [h1, T + r * K], [h1 - r + r * K, L], [h1 - r, L]]);
      right.push(line([h1 - r, L], [0, L]));
      break;
    }
    case "oval":
      right.push([[h1, T], [h1, T + OVAL_A * k], [OVAL_B * h1, L], [0, L]]);
      break;
    case "almond": {
      const tip = 0.09 * w; // мягкий кончик
      right.push([[h1, T], [h1, T + k * 0.55], [tip * 1.6, L - tip * 0.15], [0, L]]);
      break;
    }
    case "stiletto":
      right.push([[h1, T], [h1, T + k * 0.38], [h1 * 0.1, L - k * 0.12], [0, L]]);
      break;
    case "ballerina": {
      const ht = h1 * 0.52; // ширина срезанного края
      const r = 0.06 * w;
      right.push([[h1, T], [h1, T + k * 0.35], [ht + r * 0.6, L - r * 2.2], [ht, L - r]]);
      right.push([[ht, L - r], [ht - r * 0.2, L - r * 0.35], [ht - r * 0.6, L], [ht - r, L]]);
      right.push(line([ht - r, L], [0, L]));
      break;
    }
  }
  const neg = ([s, t]: Pt): Pt => [-s, t];
  const left = right
    .slice()
    .reverse()
    .map(([p0, p1, p2, p3]): Cubic => [neg(p3), neg(p2), neg(p1), neg(p0)]);
  const all = [...right, ...left];
  if (!a.taper) return all;
  // сужение гнёт контур: кривые сначала делятся на четверти, иначе ручки сузились бы сильнее самой кривой
  const warp = ([s, t]: Pt): Pt => [s * taperAt(a, L, t), t];
  return all.flatMap((cb) => quarter(cb)).map((cb) => cb.map(warp) as Cubic);
}

const lerp = (p: Pt, q: Pt, u: number): Pt => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u];

/** Деление кубической кривой в точке u (де Кастельжо). */
function split([p0, p1, p2, p3]: Cubic, u: number): [Cubic, Cubic] {
  const a = lerp(p0, p1, u);
  const b = lerp(p1, p2, u);
  const c = lerp(p2, p3, u);
  const d = lerp(a, b, u);
  const e = lerp(b, c, u);
  const m = lerp(d, e, u);
  return [
    [p0, a, d, m],
    [m, e, c, p3],
  ];
}

function quarter(cb: Cubic): Cubic[] {
  const [h1, h2] = split(cb, 0.5);
  return [...split(h1, 0.5), ...split(h2, 0.5)];
}

const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

function toD(curves: Cubic[], map: (p: Pt) => string): string {
  const parts = [`M${map(curves[0][0])}`];
  for (const [, p1, p2, p3] of curves) parts.push(`C${map(p1)} ${map(p2)} ${map(p3)}`);
  return parts.join(" ") + " Z";
}

/** d-атрибут контура ногтя в координатах руки. Чистая функция. */
export function nailPath(shape: Shape, length: Length, a: NailAnchor): string {
  const { e1, e2 } = axes(a);
  return toD(profile(shape, length, a), ([s, t]) => `${fmt(a.x + s * e2[0] + t * e1[0])} ${fmt(a.y + s * e2[1] + t * e1[1])}`);
}

/**
 * Тот же контур в собственных осях ногтя: начало — кутикула, x — поперёк, −y — к свободному краю.
 * В руку его ставит `transform="translate(x y) rotate(angle)"` якоря.
 */
export function nailPathLocal(shape: Shape, length: Length, a: NailAnchor): string {
  return toD(profile(shape, length, a), ([s, t]) => `${fmt(s)} ${fmt(-t)}`);
}

/**
 * Рамка ногтя: u ∈ [0,1] поперёк ложа (0 — левый край при взгляде от кутикулы к краю, 0.5 — ось),
 * v ∈ [0,1] от кутикулы (0) к свободному краю овала этой длины (1).
 */
export function nailFrame(
  a: NailAnchor,
  length: Length,
): { toLocal(x: number, y: number): [number, number]; toHand(u: number, v: number): [number, number] } {
  const { e1, e2 } = axes(a);
  const w = a.width;
  const L = frameLength(a, length);
  return {
    toHand(u, v) {
      const s = (u - 0.5) * w;
      const t = v * L;
      return [a.x + s * e2[0] + t * e1[0], a.y + s * e2[1] + t * e1[1]];
    },
    toLocal(x, y) {
      const dx = x - a.x;
      const dy = y - a.y;
      return [(dx * e2[0] + dy * e2[1]) / w + 0.5, (dx * e1[0] + dy * e1[1]) / L];
    },
  };
}

/**
 * Аффинная матрица SVG, переводящая единичный квадрат рамки (u, v) в координаты руки:
 * `transform="matrix(…)"` для узоров, нарисованных в u,v.
 */
export function frameMatrix(a: NailAnchor, length: Length): [number, number, number, number, number, number] {
  const { e1, e2 } = axes(a);
  const w = a.width;
  const L = frameLength(a, length);
  return [w * e2[0], w * e2[1], L * e1[0], L * e1[1], a.x - 0.5 * w * e2[0], a.y - 0.5 * w * e2[1]];
}
