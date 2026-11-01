// Панели инструментов: Цвет · Эффект · Дизайн · Форма. Говорят только со store.
// На телефоне — лист над нижней панелью, на компьютере — колонка справа.
import type { ComponentChildren } from "preact";
import { DECOR, HER_SHADES, HIS_SHADES, availableEffects, decorById, shadeById, shadeLabel, type Shade } from "../../data/palette";
import {
  DECOR_ROT_STEP,
  DECOR_SCALES,
  HIS_EFFECTS,
  HIS_LENGTHS,
  HIS_SHAPES,
  LENGTHS,
  MAX_DECOR_PER_NAIL,
  PATTERNS,
  SHAPES,
  isLongLength,
  type Effect,
  type Pattern,
  type Shape,
} from "../../state/design";
import type { DesignStore } from "../../state/store";
import { strokeNail } from "../../motion";
import { nailPathLocal } from "../geometry";
import { useStore, useUi, targetOf, type Sheet } from "./context";
import { IconCheck, IconClose, IconMinus, IconPlus, IconRotate } from "./icons";
import { EFFECT_LABEL, LENGTH_BUTTON, NAIL_NAMES, PATTERN_LABEL, SHAPE_LABEL, capitalize } from "./labels";

export const LONG_NOTE = "Это наращивание — сделаем";
export const STUB_NOTE = "Палитра студии уточняется — подписи временные";

/** id листа панели — для aria-controls кнопок инструментов. */
export const sheetId = (s: Sheet) => `dn-sheet-${s}`;

/** Мазок цвета по ногтю (таск 06; до него — мгновенно). */
export function strokeAfterPaint(target: number | "all"): void {
  if (typeof window === "undefined") return;
  requestAnimationFrame(() => {
    const ids = target === "all" ? [0, 1, 2, 3, 4] : [target];
    for (const i of ids)
      document.querySelectorAll<SVGElement>(`#constructor [data-nail="${i}"] [data-nail-paint]`).forEach((el) => {
        void strokeNail(el, Number(el.dataset.axis ?? 0));
      });
  });
}

export function PanelFrame(props: { id: Sheet; title: string; target?: boolean; children: ComponentChildren }) {
  const s = useStore();
  const ui = useUi();
  const sel = s.selected.value;
  return (
    <section class="dn-sheet" id={sheetId(props.id)} aria-label={props.title} data-sheet={props.id}>
      <div class="dn-sheet-head">
        <h2 class="dn-sheet-title">{props.title}</h2>
        {props.target && <span class="dn-sheet-target">{sel === null ? "все ногти" : NAIL_NAMES[sel].toLowerCase()}</span>}
        <button type="button" class="dn-sheet-done" onClick={() => (ui.sheet.value = null)}>
          <IconCheck size={18} />
          Готово
        </button>
      </div>
      <div class="dn-sheet-body">{props.children}</div>
    </section>
  );
}

/** Подсказка, пока ноготь не выбран; выбранный ноготь виден в заголовке листа. */
function TargetHint({ s, all }: { s: DesignStore; all: string }) {
  return s.selected.value === null ? <p class="dn-hint-line">{all}</p> : null;
}

function Chip(props: { pressed?: boolean; disabled?: boolean; onClick(): void; label?: string; children: ComponentChildren; class?: string }) {
  return (
    <button
      type="button"
      class={props.class ? `dn-chip ${props.class}` : "dn-chip"}
      aria-pressed={props.pressed === undefined ? undefined : props.pressed}
      aria-label={props.label}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

// ── Цвет ───────────────────────────────────────────────────────────────────────

export function ColorPanel() {
  const s = useStore();
  const d = s.design.value;
  const sel = s.selected.value;
  const his = d.hand === "his";
  const shades: readonly Shade[] = his ? HIS_SHADES : HER_SHADES;
  const current = sel === null ? undefined : d.nails[sel].shade;
  const paint = (id: string | null) => {
    // оттенок мужского набора несёт своё покрытие («Чёрный мат» — матовый): это делает clampForHand
    const t = targetOf(s);
    s.paint(t, id);
    strokeAfterPaint(t);
  };
  const stub = shades.some((x) => x.stub);
  return (
    <PanelFrame id="color" title="Цвет" target>
      <TargetHint s={s} all="Красим все ногти — нажми на ноготь, чтобы красить по одному" />
      <div class="dn-swatches">
        {!his && (
          <button type="button" class="dn-swatch" aria-pressed={current === null} onClick={() => paint(null)}>
            <span class="dn-swatch-dot dn-swatch-dot--natural" aria-hidden="true" />
            <span class="dn-swatch-label">Без покрытия</span>
          </button>
        )}
        {shades.map((sh) => (
          <button key={sh.id} type="button" class="dn-swatch" aria-pressed={current === sh.id} onClick={() => paint(sh.id)}>
            <span class="dn-swatch-dot" style={{ backgroundColor: sh.hex }} aria-hidden="true" />
            <span class="dn-swatch-label">{shadeLabel(sh)}</span>
          </button>
        ))}
      </div>
      <div class="dn-sheet-foot">
        {stub && <p class="dn-note">{STUB_NOTE}</p>}
        {sel !== null && (
          <button
            type="button"
            class="dn-chip dn-chip--all"
            onClick={() => {
              s.paint("all", d.nails[sel].shade);
              strokeAfterPaint("all");
            }}
          >
            На все ногти
          </button>
        )}
      </div>
    </PanelFrame>
  );
}

// ── Эффект ─────────────────────────────────────────────────────────────────────

export function EffectPanel() {
  const s = useStore();
  const d = s.design.value;
  const sel = s.selected.value;
  const available = availableEffects().filter((e) => d.hand !== "his" || HIS_EFFECTS.includes(e.id));
  const list: readonly Effect[] = available.map((e) => e.id);
  const nail = sel === null ? null : d.nails[sel];
  const hex = (nail?.shade && shadeById(nail.shade)?.hex) || "#c9a48e";
  return (
    <PanelFrame id="effect" title="Эффект" target>
      <TargetHint s={s} all="Эффект ляжет на все ногти — или нажми на один" />
      <div class="dn-chips" style={{ "--fx-color": hex }}>
        {list.map((e) => (
          <Chip key={e} pressed={nail?.effect === e} onClick={() => s.setEffect(targetOf(s), e)}>
            <span class="dn-fx" data-fx={e} aria-hidden="true" />
            {capitalize(EFFECT_LABEL[e])}
          </Chip>
        ))}
      </div>
      <div class="dn-sheet-foot">
        {available.some((e) => e.stub) && <p class="dn-note">{STUB_NOTE}</p>}
        {nail && nail.shade === null && <p class="dn-note">Эффект ложится на покрытие — сначала выбери цвет</p>}
        {sel !== null && (
          <button type="button" class="dn-chip dn-chip--all" disabled={!list.includes(d.nails[sel].effect)} onClick={() => s.setEffect("all", d.nails[sel].effect)}>
            На все ногти
          </button>
        )}
      </div>
    </PanelFrame>
  );
}

// ── Дизайн: узоры и декор ──────────────────────────────────────────────────────

export function DesignPanel() {
  const s = useStore();
  const d = s.design.value;
  const sel = s.selected.value;
  if (d.hand === "his")
    return (
      <PanelFrame id="design" title="Дизайн">
        <p class="dn-hint-line">Мужской набор — без узоров и декора: чисто и аккуратно. Цвет и покрытие — в «Цвет» и «Эффект».</p>
      </PanelFrame>
    );
  const nail = sel === null ? null : d.nails[sel];
  const full = (nail?.decor.length ?? 0) >= MAX_DECOR_PER_NAIL;
  const addDecor = (item: string) => {
    const i = sel ?? 3;
    if (sel === null) s.selected.value = i;
    s.addDecor(i, item);
  };
  return (
    <PanelFrame id="design" title="Дизайн" target>
      <TargetHint s={s} all="Узор ляжет на все ногти — или нажми на один" />
      <div class="dn-chips">
        {PATTERNS.map((p: Pattern) => (
          <Chip key={p} pressed={nail?.pattern === p} onClick={() => s.setPattern(targetOf(s), p)}>
            {capitalize(PATTERN_LABEL[p])}
          </Chip>
        ))}
        {sel !== null && (
          <button type="button" class="dn-chip dn-chip--all" onClick={() => s.setPattern("all", d.nails[sel].pattern, d.nails[sel].accent)}>
            На все ногти
          </button>
        )}
      </div>
      <h3 class="dn-sheet-sub">
        Декор <span class="dn-sheet-sub-note">{sel === null ? "— ляжет на безымянный" : "— тапни и двигай пальцем по ногтю"}</span>
      </h3>
      <div class="dn-chips">
        {DECOR.map((item) => (
          <Chip key={item.id} disabled={full} onClick={() => addDecor(item.id)}>
            <span class="dn-decor-dot" data-decor-kind={item.id} aria-hidden="true" />
            {item.name}
          </Chip>
        ))}
      </div>
      {full && <p class="dn-note">На ноготь — до трёх элементов</p>}
      {nail && nail.decor.length > 0 && sel !== null && (
        <ul class="dn-placed" aria-label="Декор на ногте">
          {nail.decor.map((dec, k) => {
            const name = decorById(dec.item)?.name ?? dec.item;
            const nextScale = DECOR_SCALES[(DECOR_SCALES.indexOf(dec.scale) + 1) % DECOR_SCALES.length];
            const smaller = DECOR_SCALES[Math.max(0, DECOR_SCALES.indexOf(dec.scale) - 1)];
            return (
              <li key={k} class="dn-placed-item">
                <span class="dn-placed-name">{name}</span>
                <button type="button" class="dn-icon-btn" aria-label={`Меньше: ${name}`} disabled={dec.scale <= DECOR_SCALES[0]} onClick={() => { s.moveDecor(sel, k, { scale: smaller }); s.endGesture(); }}>
                  <IconMinus size={18} />
                </button>
                <button type="button" class="dn-icon-btn" aria-label={`Больше: ${name}`} disabled={dec.scale >= DECOR_SCALES[DECOR_SCALES.length - 1]} onClick={() => { s.moveDecor(sel, k, { scale: nextScale }); s.endGesture(); }}>
                  <IconPlus size={18} />
                </button>
                <button type="button" class="dn-icon-btn" aria-label={`Повернуть: ${name}`} onClick={() => { s.moveDecor(sel, k, { rot: dec.rot + DECOR_ROT_STEP }); s.endGesture(); }}>
                  <IconRotate size={18} />
                </button>
                <button type="button" class="dn-icon-btn" aria-label={`Убрать: ${name}`} onClick={() => s.removeDecor(sel, k)}>
                  <IconClose size={18} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </PanelFrame>
  );
}

// ── Форма и длина, вторая рука ─────────────────────────────────────────────────

/** Силуэт формы ногтя — иконка кнопки. */
function ShapeIcon({ shape }: { shape: Shape }) {
  const a = { x: 0, y: 0, angle: 0, width: 10, bed: 12 };
  return (
    <svg class="dn-shape-icon" viewBox="-7 -24 14 25" aria-hidden="true" focusable="false">
      <path d={nailPathLocal(shape, "medium", a)} fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round" />
    </svg>
  );
}

export function ShapePanel() {
  const s = useStore();
  const d = s.design.value;
  const his = d.hand === "his";
  const shapes = his ? HIS_SHAPES : SHAPES;
  const lengths = his ? HIS_LENGTHS : LENGTHS;
  return (
    <PanelFrame id="shape" title="Форма">
      <div class="dn-chips">
        {shapes.map((sh) => (
          <Chip key={sh} pressed={d.shape === sh} onClick={() => s.setShape(sh)}>
            <ShapeIcon shape={sh} />
            {capitalize(SHAPE_LABEL[sh])}
          </Chip>
        ))}
      </div>
      <h3 class="dn-sheet-sub">Длина</h3>
      {lengths.length > 1 ? (
        <div class="dn-chips">
          {lengths.map((l) => (
            <Chip key={l} pressed={d.length === l} onClick={() => s.setLength(l)}>
              {LENGTH_BUTTON[l]}
            </Chip>
          ))}
        </div>
      ) : (
        <p class="dn-hint-line">Для мужской руки — коротко и аккуратно</p>
      )}
      {isLongLength(d.length) && <p class="dn-note dn-note--warm">{LONG_NOTE}</p>}
      <div class="dn-sheet-foot">
        <button type="button" class="dn-chip" aria-pressed={d.twoHands} onClick={() => s.toggleTwoHands()}>
          Повторить на второй руке
        </button>
      </div>
    </PanelFrame>
  );
}
