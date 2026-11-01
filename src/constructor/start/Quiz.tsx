// «Подбери мне» в три тапа: повод → настроение → длина → три дизайна, каждый открывается в конструкторе.
import { useState } from "preact/hooks";
import { MOODS, OCCASIONS, PRESETS, QUIZ_LENGTHS, type Mood, type Occasion } from "../../data/designs";
import type { Length } from "../../state/design";
import { PanelFrame } from "../tools/Panels";
import { useStore, useUi } from "../tools/context";
import { pickPresets, type QuizAnswers } from "./pick";
import { PresetThumb } from "./PresetThumb";
import { applyDesign } from "./Strip";

export const OCCASION_LABEL: Record<Occasion, string> = {
  office: "Офис",
  date: "Свидание",
  wedding: "Свадьба",
  vacation: "Отпуск",
  party: "Праздник",
};
export const MOOD_LABEL: Record<Mood, string> = { soft: "Нежно", bright: "Ярко", bold: "Дерзко" };
export const QUIZ_LENGTH_LABEL: Partial<Record<Length, string>> = { short: "Короткие", medium: "Средние", long: "Длинные" };

type Step = { key: keyof QuizAnswers; question: string; options: [string, string][] };

const STEPS: Step[] = [
  { key: "occasion", question: "Куда собираешься?", options: OCCASIONS.map((o) => [o, OCCASION_LABEL[o]]) },
  { key: "mood", question: "Какое настроение?", options: MOODS.map((m) => [m, MOOD_LABEL[m]]) },
  { key: "length", question: "Какая длина?", options: QUIZ_LENGTHS.map((l) => [l, QUIZ_LENGTH_LABEL[l] ?? l]) },
];

export function QuizPanel() {
  const s = useStore();
  const ui = useUi();
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({});
  const step = STEPS.findIndex((st) => answers[st.key] === undefined);
  const tone = s.design.value.tone;

  if (step === -1) {
    const picks = pickPresets(answers as QuizAnswers, PRESETS);
    return (
      <PanelFrame id="quiz" title="Подбери мне">
        <p class="dn-hint-line">Вот три идеи — бери любую и правь дальше</p>
        <div class="dn-quiz-results">
          {picks.map((p) => (
            <button
              key={p.id}
              type="button"
              class="dn-quiz-result"
              onClick={() => {
                applyDesign(s, p.design);
                ui.sheet.value = null;
              }}
            >
              <span class="dn-card dn-card--preset" aria-hidden="true">
                <PresetThumb design={p.design} uid={`qz-${p.id}`} tone={tone} />
              </span>
              <span class="dn-quiz-title">{p.title}</span>
            </button>
          ))}
        </div>
        <div class="dn-sheet-foot">
          <button type="button" class="dn-chip" onClick={() => setAnswers({})}>
            Подобрать заново
          </button>
        </div>
      </PanelFrame>
    );
  }

  const st = STEPS[step];
  return (
    <PanelFrame id="quiz" title="Подбери мне">
      <p class="dn-quiz-step">Шаг {step + 1} из 3</p>
      <h3 class="dn-sheet-sub">{st.question}</h3>
      <div class="dn-chips">
        {st.options.map(([value, label]) => (
          <button key={value} type="button" class="dn-chip" onClick={() => setAnswers({ ...answers, [st.key]: value })}>
            {label}
          </button>
        ))}
      </div>
      {step > 0 && (
        <div class="dn-sheet-foot">
          <button
            type="button"
            class="dn-text-btn"
            onClick={() => {
              const prev = { ...answers };
              delete prev[STEPS[step - 1].key];
              setAnswers(prev);
            }}
          >
            Назад
          </button>
        </div>
      )}
    </PanelFrame>
  );
}
