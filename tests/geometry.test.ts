import { describe, expect, it } from "vitest";
import { nailFrame, nailPath } from "../src/constructor/geometry";
import { HANDS, type NailAnchor } from "../src/constructor/hands";
import { LENGTHS, SHAPES, type Length, type Shape } from "../src/state/design";

// Разбор d-атрибута: абсолютные M L Q C Z (то, что отдаёт nailPath), выборка точек по кривым.
type Pt = [number, number];
function sample(d: string, steps = 24): { points: Pt[]; closed: boolean; numbers: number[] } {
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  const numbers: number[] = [];
  const points: Pt[] = [];
  let cur: Pt = [0, 0];
  let start: Pt = [0, 0];
  let closed = false;
  let i = 0;
  const num = () => {
    const n = Number(tokens[i++]);
    numbers.push(n);
    return n;
  };
  while (i < tokens.length) {
    const cmd = tokens[i++];
    if (cmd === "M") {
      cur = [num(), num()];
      start = cur;
      points.push(cur);
    } else if (cmd === "L") {
      const e: Pt = [num(), num()];
      for (let k = 1; k <= steps; k++) points.push([cur[0] + ((e[0] - cur[0]) * k) / steps, cur[1] + ((e[1] - cur[1]) * k) / steps]);
      cur = e;
    } else if (cmd === "Q") {
      const c: Pt = [num(), num()];
      const e: Pt = [num(), num()];
      for (let k = 1; k <= steps; k++) {
        const t = k / steps;
        const m = 1 - t;
        points.push([m * m * cur[0] + 2 * m * t * c[0] + t * t * e[0], m * m * cur[1] + 2 * m * t * c[1] + t * t * e[1]]);
      }
      cur = e;
    } else if (cmd === "C") {
      const c1: Pt = [num(), num()];
      const c2: Pt = [num(), num()];
      const e: Pt = [num(), num()];
      for (let k = 1; k <= steps; k++) {
        const t = k / steps;
        const m = 1 - t;
        points.push([
          m * m * m * cur[0] + 3 * m * m * t * c1[0] + 3 * m * t * t * c2[0] + t * t * t * e[0],
          m * m * m * cur[1] + 3 * m * m * t * c1[1] + 3 * m * t * t * c2[1] + t * t * t * e[1],
        ]);
      }
      cur = e;
    } else if (cmd === "Z") {
      closed = true;
      cur = start;
    } else {
      throw new Error(`неожиданная команда ${cmd}`);
    }
  }
  return { points, closed, numbers };
}

/** Точки ногтя в его осях: t — вдоль оси от кутикулы, s — поперёк. */
function local(a: NailAnchor, pts: Pt[]): { s: number; t: number }[] {
  const r = (a.angle * Math.PI) / 180;
  const e1: Pt = [Math.sin(r), -Math.cos(r)];
  const e2: Pt = [Math.cos(r), Math.sin(r)];
  return pts.map(([x, y]) => {
    const dx = x - a.x;
    const dy = y - a.y;
    return { s: dx * e2[0] + dy * e2[1], t: dx * e1[0] + dy * e1[1] };
  });
}

function reach(a: NailAnchor, shape: Shape, length: Length): number {
  return Math.max(...local(a, sample(nailPath(shape, length, a)).points).map((p) => p.t));
}

/** Ширина контура поперёк оси на заданной доле длины ногтя. */
function widthAt(a: NailAnchor, shape: Shape, length: Length, frac: number): number {
  const pts = local(a, sample(nailPath(shape, length, a), 80).points);
  const top = Math.max(...pts.map((p) => p.t));
  const t = top * frac;
  const near = pts.filter((p) => Math.abs(p.t - t) < top * 0.02);
  if (near.length === 0) return 0;
  return Math.max(...near.map((p) => p.s)) - Math.min(...near.map((p) => p.s));
}

const ANCHORS: [string, NailAnchor][] = (["her", "his"] as const).flatMap((k) =>
  HANDS[k].anchors.map((a, i): [string, NailAnchor] => [`${k}#${i}`, a]),
);

describe("nailPath: 6 форм × 4 длины", () => {
  it.each(ANCHORS)("%s — замкнутые контуры без NaN", (_name, a) => {
    for (const shape of SHAPES) {
      for (const length of LENGTHS) {
        const d = nailPath(shape, length, a);
        expect(d, `${shape}/${length}`).toMatch(/^M/);
        const { closed, numbers, points } = sample(d);
        expect(closed, `${shape}/${length} замкнут`).toBe(true);
        expect(numbers.length).toBeGreaterThan(8);
        expect(numbers.every(Number.isFinite), `${shape}/${length} без NaN`).toBe(true);
        expect(points.length).toBeGreaterThan(6);
      }
    }
  });

  it.each(ANCHORS)("%s — длина растёт монотонно: короткая < средняя < длинная < экстра", (_name, a) => {
    for (const shape of SHAPES) {
      const r = LENGTHS.map((l) => reach(a, shape, l));
      for (let i = 1; i < r.length; i++) expect(r[i], `${shape}: ${LENGTHS[i]} > ${LENGTHS[i - 1]}`).toBeGreaterThan(r[i - 1]);
    }
  });

  it.each(ANCHORS)("%s — короткий ноготь закрывает ложе, экстра выходит за подушечку больше чем на ширину", (_name, a) => {
    for (const shape of SHAPES) {
      expect(reach(a, shape, "short"), shape).toBeGreaterThanOrEqual(a.bed);
      expect(reach(a, shape, "extra"), shape).toBeGreaterThan(a.bed + a.width);
    }
  });

  it("формы различимы: шесть разных контуров, квадрат широк у края, стилет — острие, балерина — срезанный край", () => {
    const a = HANDS.her.anchors[2];
    for (const length of LENGTHS) {
      expect(new Set(SHAPES.map((s) => nailPath(s, length, a))).size).toBe(6);
    }
    const w = a.width;
    // у свободного края (97% длины)
    expect(widthAt(a, "square", "long", 0.97)).toBeGreaterThan(w * 0.8);
    expect(widthAt(a, "stiletto", "long", 0.97)).toBeLessThan(w * 0.15);
    const ballerina = widthAt(a, "ballerina", "long", 0.97);
    expect(ballerina).toBeGreaterThan(w * 0.3);
    expect(ballerina).toBeLessThan(w * 0.75);
    expect(widthAt(a, "almond", "long", 0.97)).toBeLessThan(widthAt(a, "oval", "long", 0.97));
    expect(widthAt(a, "soft-square", "long", 0.97)).toBeLessThan(widthAt(a, "square", "long", 0.97));
  });
});

// Ногти дизайна месяца на утверждённом макете (.impeccable/mocks/comp-1.png, 1536×2752), замер по пикселям:
// длина от кутикулы до кончика и наибольшая ширина по середине обводки, px макета. Рука на макете — в кадре платы:
// 1 px макета = 1470 / 1046 единиц руки (контур руки от x = 183 до 1229 px ↔ bounds 265…1735).
const COMP_PX = 1470 / 1046;
const COMP_NAILS: [string, number, number][] = [
  ["большой", 238.4, 58.9],
  ["указательный", 231.2, 116.9],
  ["средний", 242.7, 119.0],
  ["безымянный", 237.9, 115.7],
  ["мизинец", 194.7, 85.7],
];

describe("овал / короткие на её руке — ногти макета", () => {
  it.each(COMP_NAILS.map((n, i) => [...n, i] as const))("%s: длина и ширина как в макете", (_name, len, wid, i) => {
    const a = HANDS.her.anchors[i];
    const L = reach(a, "oval", "short");
    expect(Math.abs(L / COMP_PX - len) / len, `длина ${(L / COMP_PX).toFixed(1)} px, в макете ${len}`).toBeLessThan(0.03);
    const pts = local(a, sample(nailPath("oval", "short", a), 80).points);
    const w = Math.max(...pts.map((p) => p.s)) - Math.min(...pts.map((p) => p.s));
    expect(Math.abs(w / COMP_PX - wid) / wid, `ширина ${(w / COMP_PX).toFixed(1)} px, в макете ${wid}`).toBeLessThan(0.05);
  });

  it("ноготь скруглён и у кутикулы: у самой кутикулы заметно уже середины", () => {
    for (const a of HANDS.her.anchors.slice(1)) {
      const mid = widthAt(a, "oval", "short", 0.5);
      // в макете на 4% длины от кутикулы ширина — 0.5–0.65 наибольшей; срезанный край дал бы почти всю ширину
      expect(widthAt(a, "oval", "short", 0.04) / mid).toBeLessThan(0.72);
      expect(widthAt(a, "oval", "short", 0.04) / mid).toBeGreaterThan(0.4);
    }
  });

  it("большой палец виден сбоку: ноготь сужается к кончику, как в макете", () => {
    const a = HANDS.her.anchors[0];
    const mid = widthAt(a, "oval", "short", 0.45);
    // макет: на 90% длины — половина ширины, у кутикулы (6%) — чуть больше половины
    expect(widthAt(a, "oval", "short", 0.9) / mid).toBeLessThan(0.62);
    expect(widthAt(a, "oval", "short", 0.06) / mid).toBeLessThan(0.7);
  });
});

describe("nailFrame", () => {
  const a = HANDS.her.anchors[1];
  it("u,v ↔ координаты руки: (0.5, 0) — кутикула, обратное преобразование точное", () => {
    const f = nailFrame(a, "medium");
    const [x, y] = f.toHand(0.5, 0);
    expect(x).toBeCloseTo(a.x, 6);
    expect(y).toBeCloseTo(a.y, 6);
    for (const [u, v] of [
      [0, 0],
      [1, 0.3],
      [0.25, 0.9],
      [0.7, 1],
    ]) {
      const [hx, hy] = f.toHand(u, v);
      const [lu, lv] = f.toLocal(hx, hy);
      expect(lu).toBeCloseTo(u, 6);
      expect(lv).toBeCloseTo(v, 6);
    }
  });

  it("u — поперёк на всю ширину ложа, v = 1 — дальше подушечки и тем дальше, чем длиннее ноготь", () => {
    const f = nailFrame(a, "short");
    const [x0, y0] = f.toHand(0, 0);
    const [x1, y1] = f.toHand(1, 0);
    expect(Math.hypot(x1 - x0, y1 - y0)).toBeCloseTo(a.width, 6);
    const tip = (l: Length) => {
      const [x, y] = nailFrame(a, l).toHand(0.5, 1);
      return Math.hypot(x - a.x, y - a.y);
    };
    expect(tip("short")).toBeGreaterThan(a.bed);
    expect(tip("medium")).toBeGreaterThan(tip("short"));
    expect(tip("long")).toBeGreaterThan(tip("medium"));
    expect(tip("extra")).toBeGreaterThan(tip("long"));
  });
});

describe("якоря рук", () => {
  it.each(["her", "his"] as const)("%s: пять ногтей внутри силуэта, большой смотрит вверх, согнутые пальцы — вниз", (kind) => {
    const art = HANDS[kind];
    const [x0, y0, x1, y1] = art.bounds;
    expect(art.anchors).toHaveLength(5);
    art.anchors.forEach((a, i) => {
      expect(a.x).toBeGreaterThan(x0);
      expect(a.x).toBeLessThan(x1);
      expect(a.y).toBeGreaterThan(y0);
      expect(a.y).toBeLessThan(y1);
      expect(a.width).toBeGreaterThan(40);
      expect(a.bed).toBeGreaterThan(a.width * 0.8);
      if (i === 0) expect(Math.abs(a.angle)).toBeLessThan(60);
      else expect(Math.abs(a.angle)).toBeGreaterThan(120);
    });
    // слева направо: большой → мизинец
    for (let i = 1; i < 5; i++) expect(art.anchors[i].x).toBeGreaterThan(art.anchors[i - 1].x);
  });
});
