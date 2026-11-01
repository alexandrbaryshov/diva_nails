import palette from "../../data/palette.json";
import type { Effect } from "../state/design";

export interface AvailableEffect { id: Effect; stub: boolean }
/** Доступность — данные студии; порядок эффектов кодека v1 не меняется. */
export function availableEffects(): readonly AvailableEffect[] {
  return palette.effects as readonly AvailableEffect[];
}

export type ShadeFamily =
  | "milk"
  | "nude"
  | "pink"
  | "caramel"
  | "berry"
  | "red"
  | "brown"
  | "grey"
  | "black"
  | "white"
  | "clear";

export interface Shade {
  /** "DN01" — стабильный ключ */
  id: string;
  /** 1..255 — стабильный номер для ссылки; никогда не переиспользуется */
  idx: number;
  /** "DN 01" — то, что видит мастер */
  code: string;
  /** "Молочный" */
  name: string;
  /** null — бренд уточняется */
  brand: string | null;
  /** "#F2E6DC" */
  hex: string;
  family: ShadeFamily;
  /** мужской набор */
  forHis?: true;
  /** покрытие, которое идёт вместе с оттенком (мужской набор: «Чёрный мат» → matte) */
  effect?: Effect;
  /** true — временная запись */
  stub: boolean;
}

/** Оттенок, которого больше нет в студии: хранится, чтобы старые ссылки нашли ближайший по цвету. */
export interface RetiredShade {
  id: string;
  idx: number;
  code: string;
  name: string;
  hex: string;
}

export interface DecorItem {
  id: string;
  /** 0..15 — номер в ссылке (4 бита); никогда не переиспользуется */
  idx: number;
  kind: "rhinestone" | "sticker";
  name: string;
  stub: boolean;
}

export const SHADES: readonly Shade[] = palette.shades as unknown as readonly Shade[];
export const RETIRED_SHADES: readonly RetiredShade[] = palette.retired as unknown as readonly RetiredShade[];
export const DECOR: readonly DecorItem[] = palette.decor as unknown as readonly DecorItem[];

/** Палитра женской руки (без мужского набора). */
export const HER_SHADES: readonly Shade[] = SHADES.filter((s) => !s.forHis);
/** Мужской набор. */
export const HIS_SHADES: readonly Shade[] = SHADES.filter((s) => s.forHis);

const byId = new Map(SHADES.map((s) => [s.id, s]));
const byIdx = new Map(SHADES.map((s) => [s.idx, s]));
const decorId = new Map(DECOR.map((d) => [d.id, d]));
const decorIdx = new Map(DECOR.map((d) => [d.idx, d]));

export function shadeById(id: string): Shade | undefined {
  return byId.get(id);
}

export function shadeByIdx(idx: number): Shade | undefined {
  return byIdx.get(idx);
}

export function decorById(id: string): DecorItem | undefined {
  return decorId.get(id);
}

export function decorByIdx(idx: number): DecorItem | undefined {
  return decorIdx.get(idx);
}

type Lab = [number, number, number];

function hexToLab(hex: string): Lab {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`Не цвет: ${hex}`);
  const n = parseInt(m[1], 16);
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const r = lin((n >> 16) & 255);
  const g = lin((n >> 8) & 255);
  const b = lin(n & 255);
  // sRGB → XYZ (D65), нормировка на белую точку
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** Ближайший по цвету оттенок (ΔE76 в CIELAB). */
export function nearestShade(hex: string, pool: readonly Shade[] = SHADES): Shade {
  if (pool.length === 0) throw new Error("nearestShade: пустая палитра");
  const [l, a, b] = hexToLab(hex);
  let best = pool[0];
  let bestDist = Infinity;
  for (const s of pool) {
    const [l2, a2, b2] = hexToLab(s.hex);
    const dist = (l - l2) ** 2 + (a - a2) ** 2 + (b - b2) ** 2;
    if (dist < bestDist) {
      best = s;
      bestDist = dist;
    }
  }
  return best;
}

/** Подпись оттенка, одна для палитры и карточки: «Kodi 40», пока бренда нет — «DN 01 · Молочный». */
export function shadeLabel(s: Shade): string {
  return s.brand ? `${s.brand} ${s.code}` : `${s.code} · ${s.name}`;
}
