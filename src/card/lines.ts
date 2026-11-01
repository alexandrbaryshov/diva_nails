// Тексты карточки: что на каждом ногте, форма и длина.
import { decorById, shadeById, shadeLabel } from "../data/palette";
import type { Design } from "../state/design";
import { EFFECT_LABEL, LENGTH_LABEL, NAIL_NAMES, PATTERN_LABEL, SHAPE_LABEL, capitalize } from "../constructor/tools/labels";

/**
 * По строке на палец: «Безымянный — DN 22 · Вишня, хром, френч, декор: Жемчужина».
 * Оттенок подписан так же, как в палитре (shadeLabel); глянец — по умолчанию, не называется.
 */
export function cardLines(d: Design): { nail: string; text: string }[] {
  return d.nails.map((n, i) => {
    const s = n.shade ? shadeById(n.shade) : undefined;
    let text = s ? shadeLabel(s) : "без покрытия";
    const effect = s ? n.effect : "gloss";
    if (effect !== "gloss" && effect !== s?.effect) text += `, ${EFFECT_LABEL[effect]}`;
    if (n.pattern !== "none") text += `, ${PATTERN_LABEL[n.pattern]}`;
    const decor = [...new Set(n.decor.map((x) => decorById(x.item)?.name).filter((x): x is string => !!x))];
    if (decor.length) text += `, декор: ${decor.join(", ")}`;
    return { nail: NAIL_NAMES[i], text };
  });
}

/** «Миндаль, средняя длина» */
export function cardShapeLine(d: Design): string {
  return capitalize(`${SHAPE_LABEL[d.shape]}, ${LENGTH_LABEL[d.length]}`);
}

/** «24 октября 2026» */
export function cardDate(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

