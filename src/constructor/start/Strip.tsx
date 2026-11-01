// Лента «Дизайн месяца»: «Подбери мне», «Удиви меня» и готовые дизайны сезона (первый — дизайн месяца).
// На мужской руке — «Мужской набор»: четыре покрытия набора.
import type { JSX } from "preact";
import { useRef } from "preact/hooks";
import { MONTH_PRESET, PRESETS } from "../../data/designs";
import { HER_SHADES, HIS_SHADES } from "../../data/palette";
import { naturalDesign, type Design } from "../../state/design";
import type { DesignStore } from "../../state/store";
import { useStore, useUi } from "../tools/context";
import { IconChevronLeft, IconChevronRight, IconSurprise, IconWand } from "../tools/icons";
import { strokeAfterPaint } from "../tools/Panels";
import { PresetThumb } from "./PresetThumb";
import { surpriseDifferent } from "./surprise";

/** Применить готовый дизайн: тон кожи и вторая рука — свои, всё остальное — из дизайна. Один шаг истории. */
export function applyDesign(s: DesignStore, design: Design): void {
  const cur = s.design.value;
  s.load({ ...design, tone: cur.tone, twoHands: cur.twoHands });
  s.selected.value = null;
  strokeAfterPaint("all");
}

interface Item {
  key: string;
  label: string;
  design: Design;
}

/** Готовые дизайны ленты: её — дизайн месяца и сезон, его — мужской набор. */
export function stripItems(hand: Design["hand"]): Item[] {
  if (hand === "his")
    return HIS_SHADES.map((sh) => {
      const d = naturalDesign("his");
      return {
        key: sh.id,
        label: sh.name,
        design: { ...d, nails: d.nails.map((n) => ({ ...n, shade: sh.id, effect: sh.effect ?? n.effect })) as Design["nails"] },
      };
    });
  return [MONTH_PRESET, ...PRESETS.filter((p) => p !== MONTH_PRESET)].map((p) => ({
    key: p.id,
    label: p === MONTH_PRESET ? `Дизайн месяца: ${p.title}` : p.title,
    design: p.design,
  }));
}

export function Strip() {
  const s = useStore();
  const ui = useUi();
  const d = s.design.value;
  const his = d.hand === "his";
  const row = useRef<HTMLDivElement>(null);
  const items = stripItems(d.hand);

  const scrollBy = (dir: 1 | -1) => {
    const el = row.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };
  const onKey = (e: JSX.TargetedKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const cards = [...e.currentTarget.querySelectorAll<HTMLButtonElement>(".dn-card")];
    const at = cards.indexOf(document.activeElement as HTMLButtonElement);
    if (at < 0) return;
    e.preventDefault();
    const next = cards[Math.min(cards.length - 1, Math.max(0, at + (e.key === "ArrowRight" ? 1 : -1)))];
    next.focus();
    next.scrollIntoView?.({ inline: "nearest", block: "nearest" });
  };
  const onSurprise = () => {
    const next = surpriseDifferent(Math.random, his ? HIS_SHADES : HER_SHADES, d.hand, s.design.value);
    applyDesign(s, next);
  };

  return (
    <section class="dn-strip" aria-label={his ? "Мужской набор" : "Дизайн месяца"}>
      <div class="dn-strip-head">
        <h2 class="dn-strip-title">{his ? "Мужской набор" : "Дизайн месяца"}</h2>
        <div class="dn-strip-arrows">
          <button type="button" class="dn-icon-btn" aria-label="Листать назад" onClick={() => scrollBy(-1)}>
            <IconChevronLeft size={20} />
          </button>
          <button type="button" class="dn-icon-btn" aria-label="Листать вперёд" onClick={() => scrollBy(1)}>
            <IconChevronRight size={20} />
          </button>
        </div>
      </div>
      <div class="dn-strip-row" ref={row} onKeyDown={onKey}>
        {!his && (
          <button type="button" class="dn-card dn-card--action" aria-pressed={ui.sheet.value === "quiz"} onClick={() => (ui.sheet.value = "quiz")}>
            <IconWand class="dn-card-icon" size={19} />
            <span class="dn-card-label">Подбери мне</span>
          </button>
        )}
        <button type="button" class="dn-card dn-card--action" onClick={onSurprise}>
          <IconSurprise class="dn-card-icon" size={19} />
          <span class="dn-card-label">Удиви меня</span>
        </button>
        {items.map((it) => (
          <button key={it.key} type="button" class="dn-card dn-card--preset" aria-label={it.label} title={it.label} onClick={() => applyDesign(s, it.design)}>
            <PresetThumb design={it.design} uid={`pt-${it.key}`} tone={d.tone} />
          </button>
        ))}
      </div>
    </section>
  );
}
