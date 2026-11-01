// Подписи интерфейса конструктора: формы, длины, эффекты, узоры. Одни на панели, в тексте записи и на карточке.
import type { HandKind, Length, Shape, Tone } from "../../state/design";
import { NAIL_NAMES } from "../hands";
import { EFFECT_LABEL, PATTERN_LABEL } from "../NailFinish";

export { EFFECT_LABEL, PATTERN_LABEL, NAIL_NAMES };

/** «миндаль» — как форму называет мастер. */
export const SHAPE_LABEL: Record<Shape, string> = {
  square: "квадрат",
  "soft-square": "мягкий квадрат",
  oval: "овал",
  almond: "миндаль",
  ballerina: "балерина",
  stiletto: "стилет",
};

/** «средняя длина» — для текста записи и карточки. */
export const LENGTH_LABEL: Record<Length, string> = {
  short: "короткая длина",
  medium: "средняя длина",
  long: "длинная (наращивание)",
  extra: "экстра (наращивание)",
};

/** Кнопки длины на панели «Форма». */
export const LENGTH_BUTTON: Record<Length, string> = {
  short: "Короткая",
  medium: "Средняя",
  long: "Длинная",
  extra: "Экстра",
};

export const HAND_LABEL: Record<HandKind, string> = { her: "Её", his: "Его" };

/** Тон кожи — подпись точки выбора для экранного диктора. */
export const TONE_LABEL: Record<Tone, string> = {
  0: "Очень светлая кожа",
  1: "Светлая кожа",
  2: "Смуглая кожа",
  3: "Тёмная кожа",
};

/** «безымянный» — ноготь в тексте. */
export function nailName(i: number): string {
  return NAIL_NAMES[i].toLowerCase();
}

/** С большой буквы, для кнопок и заголовков. */
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
