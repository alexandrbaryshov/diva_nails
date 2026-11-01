import visit from "../../data/visit.json";

export interface VisitStep {
  id: "booking" | "welcome" | "brief" | "tools" | "work" | "care";
  title: string;
  /** факты из facts.md, которые можно назвать на этом шаге */
  facts: string[];
  /** что на этом шаге ещё уточняется */
  pending: string[];
  /** ключ картинки в src/media/manifest.ts; null — фото ещё нет */
  media: string | null;
}

export interface Master {
  name: string;
  /** что о мастере известно из отзывов; null — ничего */
  about: string | null;
  /** ключ фото в src/media/manifest.ts; null — фото уточняется */
  photo: string | null;
}

export const VISIT_STEPS: readonly VisitStep[] = visit.steps as unknown as readonly VisitStep[];
export const MASTERS: readonly Master[] = visit.masters as unknown as readonly Master[];
