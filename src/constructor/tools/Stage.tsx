// Сцена: рука (и вторая, зеркальная), подсказка «нажми на ноготь», история, пометки.
import { useEffect, useRef, useState } from "preact/hooks";
import { linkNotice } from "../../state/boot";
import { isLongLength } from "../../state/design";
import { HandView } from "../HandView";
import { HANDS } from "../hands";
import { useStore, useUi } from "./context";
import { attachNailGestures } from "./gestures";
import { HintArrow, IconClose, IconRedo, IconUndo } from "./icons";
import { LONG_NOTE } from "./Panels";

export const TAP_HINT = "нажми на ноготь\nдля выбора";
/** Ширина невидимой обводки ногтя на экране: ноготь + 2 × 17 px ≥ 44 px даже у мизинца. */
const HIT_PX = 34;

/** ↶ ↷ «Сбросить». На телефоне появляются с первым действием или открытым листом, на компьютере видны всегда. */
export function HistoryControls() {
  const s = useStore();
  const ui = useUi();
  const active = ui.sheet.value !== null || s.canUndo.value || s.canRedo.value;
  return (
    <div class="dn-history" role="group" aria-label="История" hidden={!active} data-idle={active ? undefined : ""}>
      <button type="button" class="dn-icon-btn" aria-label="Отменить" title="Отменить (Ctrl+Z)" disabled={!s.canUndo.value} onClick={() => s.undo()}>
        <IconUndo size={20} />
      </button>
      <button type="button" class="dn-icon-btn" aria-label="Вернуть" title="Вернуть (Ctrl+Shift+Z)" disabled={!s.canRedo.value} onClick={() => s.redo()}>
        <IconRedo size={20} />
      </button>
      <button type="button" class="dn-text-btn" onClick={() => s.reset()}>
        Сбросить
      </button>
    </div>
  );
}

const NOTICE: Record<string, string> = {
  "bad-link": "Ссылка не открылась — показали дизайн месяца",
  "old-version": "Ссылка не открылась — показали дизайн месяца",
  "unknown-shade": "Такого оттенка в студии уже нет — поставили ближайший по цвету",
};

function LinkNotice() {
  const warnings = linkNotice.value;
  const [hidden, setHidden] = useState<readonly unknown[] | null>(null);
  if (!warnings.length || hidden === warnings) return null;
  const text = NOTICE[warnings.includes("bad-link") ? "bad-link" : warnings.includes("old-version") ? "old-version" : "unknown-shade"];
  return (
    <p class="dn-notice" role="status">
      {text}
      <button type="button" class="dn-icon-btn" aria-label="Скрыть" onClick={() => setHidden(warnings)}>
        <IconClose size={16} />
      </button>
    </p>
  );
}

export function Stage() {
  const s = useStore();
  const ui = useUi();
  const d = s.design.value;
  const prints = s.prints.value;
  const sel = s.selected.value;
  const reference = s.reference.value;
  const sheet = ui.sheet.value;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => (ref.current ? attachNailGestures(ref.current, s, ui) : undefined), [s, ui]);

  // Зона касания ногтя — не меньше 44 px на экране при любом размере руки:
  // невидимая обводка контура = 34 px экрана в единицах рисунка руки.
  useEffect(() => {
    const hands = ref.current?.querySelector<HTMLElement>(".dn-hands");
    const hand = hands?.querySelector<HTMLElement>(".dn-hand");
    if (!hands || !hand || typeof ResizeObserver === "undefined") return;
    const vh = HANDS[s.design.value.hand].viewBox[3];
    const update = () => {
      const k = hand.getBoundingClientRect().height / vh;
      if (k > 0) hands.style.setProperty("--nail-hit", (HIT_PX / k).toFixed(1));
    };
    const ro = new ResizeObserver(update);
    ro.observe(hand);
    update();
    return () => ro.disconnect();
  }, [s, d.twoHands]);

  const onNailTap = (i: number) => {
    s.selected.value = i;
    if (ui.sheet.value === null || ui.sheet.value === "quiz") ui.sheet.value = "color";
  };
  const editing = sheet === "design" || sheet === "picture";

  return (
    <div class={editing ? "dn-stage is-editing" : "dn-stage"} ref={ref}>
      {/* плата области «hand» макета: media-src/hands/her-plate.png (и his-plate.png) — тот же рисунок, что SVG-файлы рук (D01) */}
      <div class={d.twoHands ? "dn-hands dn-hands--two" : "dn-hands"} data-plate={HANDS[d.hand].plate}>
        <div class="dn-hand">
          <HandView design={d} prints={prints} selected={sel} interactive onNailTap={onNailTap} />
          {sel === null && !d.twoHands && (
            <p class="dn-taphint">
              <HintArrow class="dn-taphint-arrow" />
              <span class="dn-taphint-text">{TAP_HINT}</span>
            </p>
          )}
        </div>
        {d.twoHands && (
          <div class="dn-hand dn-hand--mirror">
            <HandView design={d} prints={prints} selected={sel} interactive onNailTap={onNailTap} mirrored />
          </div>
        )}
      </div>
      <HistoryControls />
      {isLongLength(d.length) && <p class="dn-badge">{LONG_NOTE}</p>}
      {reference && (
        <figure class="dn-ref">
          <img src={reference.url} alt="Референс" width={56} height={56} />
          <figcaption>хочу похоже</figcaption>
        </figure>
      )}
      <LinkNotice />
    </div>
  );
}
