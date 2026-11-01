// «Подбери мне»: повод → настроение → длина, на выходе три готовых дизайна из ленты.
import { MOODS, OCCASIONS, QUIZ_LENGTHS, type Mood, type Occasion, type Preset } from "../../data/designs";
import type { Length } from "../../state/design";

export interface QuizAnswers {
  occasion: Occasion;
  mood: Mood;
  length: Length;
}

/** Насколько дизайн подходит к ответам: каждый совпавший ответ — поровну. */
function score(p: Preset, a: QuizAnswers): number {
  return (p.tags.occasion.includes(a.occasion) ? 1 : 0) + (p.tags.mood === a.mood ? 1 : 0) + (p.tags.length === a.length ? 1 : 0);
}

/**
 * Три разных дизайна, лучшие по ответам. При равенстве порядок зависит от самих ответов:
 * так любой другой ответ даёт другую выдачу, даже когда совпадений мало.
 */
export function pickPresets(answers: QuizAnswers, all: readonly Preset[]): [Preset, Preset, Preset] {
  if (all.length < 3) throw new Error("pickPresets: в ленте меньше трёх дизайнов");
  const n = all.length;
  const seed =
    Math.max(0, OCCASIONS.indexOf(answers.occasion)) * 9 +
    Math.max(0, MOODS.indexOf(answers.mood)) * 3 +
    Math.max(0, QUIZ_LENGTHS.indexOf(answers.length));
  const ranked = all
    .map((p, i) => ({ p, s: score(p, answers), t: (i + seed * 4) % n }))
    .sort((x, y) => y.s - x.s || x.t - y.t);
  return [ranked[0].p, ranked[1].p, ranked[2].p];
}
