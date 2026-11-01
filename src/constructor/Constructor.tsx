// Первый экран — конструктор маникюра (утверждённый макет .impeccable/mocks/comp-1.png).
// Телефон: заголовок, «Её | Его» и тон, рука, лента «Дизайн месяца», нижняя панель инструментов.
// Компьютер (≥ 900 px): рука крупно слева, инструменты колонкой справа.
import type { JSX } from "preact";
import { useEffect, useMemo } from "preact/hooks";
import { store as appStore, type DesignStore } from "../state/store";
import { AuthorExport } from "./author/AuthorExport";
import { QuizPanel } from "./start/Quiz";
import { Strip } from "./start/Strip";
import { StoreContext, UiContext, createUi, type ConstructorUi, type Sheet } from "./tools/context";
import { HandBar } from "./tools/HandBar";
import { ColorPanel, DesignPanel, EffectPanel, ShapePanel } from "./tools/Panels";
import { PicturePanel } from "./tools/PicturePanel";
import { Stage } from "./tools/Stage";
import { Toolbar } from "./tools/Toolbar";
import "../styles/constructor.css";

const PANELS: Record<Sheet, () => JSX.Element | null> = {
  color: ColorPanel,
  effect: EffectPanel,
  design: DesignPanel,
  shape: ShapePanel,
  picture: PicturePanel,
  quiz: QuizPanel,
};

/** Лист инструмента. На телефоне закрытый лист скрыт (видна лента), на компьютере колонка показывает «Цвет». */
function SheetHost({ ui }: { ui: ConstructorUi }) {
  const sheet = ui.sheet.value;
  const Panel = PANELS[sheet ?? "color"];
  return (
    <div class="dn-sheetwrap" hidden={sheet === null} data-idle={sheet === null ? "" : undefined}>
      <Panel />
    </div>
  );
}

function isTyping(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}

export function Constructor({ store = appStore }: { store?: DesignStore }) {
  const ui = useMemo(createUi, []);
  const s = store;

  // на компьютере колонка инструментов открыта сразу — «Цвет»
  useEffect(() => {
    if (ui.sheet.value === null && window.matchMedia?.("(min-width: 900px)").matches) ui.sheet.value = "color";
  }, [ui]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
      } else if (mod && key === "y") {
        e.preventDefault();
        s.redo();
      } else if (
        e.key === "Escape" &&
        ui.sheet.value !== null &&
        !document.getElementById("booking-sheet") &&
        !window.matchMedia?.("(min-width: 900px)").matches
      ) {
        ui.sheet.value = null;
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [s, ui]);

  const d = s.design.value;
  const sheet = ui.sheet.value;
  return (
    <StoreContext.Provider value={s}>
      <UiContext.Provider value={ui}>
        <section id="constructor" class="dn" aria-label="Конструктор маникюра" data-hand={d.hand} data-sheet={sheet ?? undefined}>
          <div class="dn-intro">
            <h1 class="dn-headline">
              <span class="dn-headline-line">Нарисуй мечту —</span> <span class="dn-headline-line">мы сделаем</span>
            </h1>
            <HandBar />
          </div>
          <Stage />
          <div class="dn-side">
            <SheetHost ui={ui} />
            <Strip />
            <Toolbar />
            <AuthorExport />
          </div>
        </section>
      </UiContext.Provider>
    </StoreContext.Provider>
  );
}
