// Связи секций с конструктором: переключить руку и прокрутить к ней.
import type { HandKind } from "../state/design";
import { store } from "../state/store";

/** Прокрутка к #constructor; плавность — из CSS (scroll-behavior, выключается при reduced motion). */
export function scrollToConstructor(): void {
  document.getElementById("constructor")?.scrollIntoView({ block: "start" });
}

/** «Нарисовать в конструкторе»: нужная рука и прокрутка наверх. */
export function openConstructor(hand: HandKind): void {
  store.setHand(hand);
  scrollToConstructor();
}