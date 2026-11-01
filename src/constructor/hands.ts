// Иллюстрации рук и якоря ногтей под каждую. Рисунок — SVG-файлы в public/hands/ (трассировка плат KIE,
// см. scripts/hands/), координаты якорей — в единицах viewBox этих файлов (src/constructor/handArt.json).
import type { HandKind, Tone } from "../state/design";
import art from "./handArt.json";
import toneData from "./handTones.json";

/**
 * Якорь ногтя в координатах viewBox руки.
 * x, y — центр кутикулы (самая близкая к пальцу точка ложа);
 * angle — направление оси ногтя от кутикулы к свободному краю, градусы: 0 — вверх (−y), по часовой — плюс (как SVG rotate);
 * width — ширина ложа; bed — длина ложа от кутикулы до кончика пальца.
 * Палец, видный сбоку (большой палец макета), сужает ноготь в перспективе:
 * cap — глубина скругления у кутикулы в ширинах (по умолчанию как у пальцев, видных спереди),
 * taper — насколько ноготь сужается к свободному краю (0 — нет; ширина × (1 − taper·(t/L)²)).
 */
export interface NailAnchor {
  x: number;
  y: number;
  angle: number;
  width: number;
  bed: number;
  cap?: number;
  taper?: number;
}

export interface HandArt {
  kind: HandKind;
  viewBox: [number, number, number, number];
  /** URL SVG-файла руки по тону 0..3 */
  tones: [string, string, string, string];
  /** большой → мизинец */
  anchors: [NailAnchor, NailAnchor, NailAnchor, NailAnchor, NailAnchor];
  /** рамка силуэта руки [x0, y0, x1, y1]; нижний край — срез запястья */
  bounds: [number, number, number, number];
  /** плата impeccable, из которой трассирован рисунок (этап plates сверяет её с макетом) */
  plate: string;
}

type ArtJson = Record<HandKind, { viewBox: number[]; bounds: number[]; anchors: NailAnchor[] }>;

function handUrl(kind: HandKind, tone: Tone): string {
  return `${import.meta.env.BASE_URL}hands/${kind}-${tone}.svg`;
}

function makeArt(kind: HandKind): HandArt {
  const a = (art as ArtJson)[kind];
  return {
    kind,
    viewBox: a.viewBox as HandArt["viewBox"],
    tones: [handUrl(kind, 0), handUrl(kind, 1), handUrl(kind, 2), handUrl(kind, 3)],
    anchors: a.anchors.map((n) => ({ ...n })) as HandArt["anchors"],
    bounds: a.bounds as HandArt["bounds"],
    plate: `media-src/hands/${kind}-plate.png`,
  };
}

export const HANDS: Record<HandKind, HandArt> = { her: makeArt("her"), his: makeArt("his") };

/** Цвет кожи каждого тона — для точек выбора тона. */
export const TONE_SWATCHES: readonly [string, string, string, string] = toneData.tones.map((t) => t.skin) as [
  string,
  string,
  string,
  string,
];

/** Названия ногтей по порядку дизайна: большой → мизинец. */
export const NAIL_NAMES: readonly [string, string, string, string, string] = [
  "Большой",
  "Указательный",
  "Средний",
  "Безымянный",
  "Мизинец",
];
