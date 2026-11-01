import designs from "../../data/designs.json";
import type { Design, Length } from "../state/design";

export type Occasion = "office" | "date" | "wedding" | "vacation" | "party";
export type Mood = "soft" | "bright" | "bold";

/** Ответы квиза «Подбери мне» в порядке показа. */
export const OCCASIONS: readonly Occasion[] = ["office", "date", "wedding", "vacation", "party"];
export const MOODS: readonly Mood[] = ["soft", "bright", "bold"];
export const QUIZ_LENGTHS: readonly Length[] = ["short", "medium", "long"];

export interface Preset {
  id: string;
  /** «Молочный френч с вишнёвым хромом» */
  title: string;
  /** ровно у одного — дизайн месяца */
  month?: true;
  tags: { occasion: Occasion[]; mood: Mood; length: Length };
  /** полный дизайн */
  design: Design;
  /** true — временный дизайн (наш, не от мастеров студии) */
  stub: boolean;
}

/** Сезон стартовых дизайнов. */
export const SEASON: string = designs.season;
export const PRESETS: readonly Preset[] = designs.presets as unknown as readonly Preset[];

function findMonth(all: readonly Preset[]): Preset {
  const month = all.find((p) => p.month);
  if (!month) throw new Error("data/designs.json: нет дизайна с month: true");
  return month;
}

export const MONTH_PRESET: Preset = findMonth(PRESETS);
