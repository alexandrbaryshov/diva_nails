// Общее состояние конструктора для панелей: хранилище дизайна и состояние интерфейса.
// Хранилище — единственный экземпляр приложения (store); в тестах передаётся своё.
import { signal, type Signal } from "@preact/signals";
import { createContext } from "preact";
import { useContext } from "preact/hooks";
import { store as appStore, type DesignStore } from "../../state/store";

/** Инструменты нижней панели (на компьютере — вкладки колонки справа). */
export type Tool = "color" | "effect" | "design" | "shape" | "picture";
/** Что открыто в листе над панелью: инструмент или «Подбери мне». */
export type Sheet = Tool | "quiz";

export const TOOLS: readonly { id: Tool; label: string }[] = [
  { id: "color", label: "Цвет" },
  { id: "effect", label: "Эффект" },
  { id: "design", label: "Дизайн" },
  { id: "shape", label: "Форма" },
  { id: "picture", label: "Картинка" },
];

export interface ConstructorUi {
  /** открытый лист; null — на телефоне видна лента «Дизайн месяца» */
  sheet: Signal<Sheet | null>;
}

export function createUi(): ConstructorUi {
  return { sheet: signal<Sheet | null>(null) };
}

export const StoreContext = createContext<DesignStore>(appStore);
export const UiContext = createContext<ConstructorUi>(createUi());

export function useStore(): DesignStore {
  return useContext(StoreContext);
}

export function useUi(): ConstructorUi {
  return useContext(UiContext);
}

/** Кому достанется действие панели: выбранный ноготь или, пока ни один не выбран, все пять. */
export function targetOf(s: DesignStore): number | "all" {
  return s.selected.value ?? "all";
}
