// Нижняя панель, как в фоторедакторе: Цвет · Эффект · Дизайн · Форма · Картинка · Сохранить.
import type { JSX } from "preact";
import { saveFlow } from "../../card";
import { TOOLS, useUi, type Tool } from "./context";
import { IconPalette, IconPencil, IconPicture, IconShape, IconWand } from "./icons";
import { sheetId } from "./Panels";

const ICON: Record<Tool, (p: { size?: number }) => JSX.Element> = {
  color: IconPalette,
  effect: IconWand,
  design: IconPencil,
  shape: IconShape,
  picture: IconPicture,
};

/** На компьютере колонка инструментов видна всегда: повторный выбор не сворачивает её. */
const wide = () => typeof window !== "undefined" && window.matchMedia?.("(min-width: 900px)").matches === true;

export function Toolbar() {
  const ui = useUi();
  const sheet = ui.sheet.value;

  const onKey = (e: JSX.TargetedKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const items = [...e.currentTarget.querySelectorAll<HTMLButtonElement>("button")];
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    if (at < 0) return;
    e.preventDefault();
    items[(at + (e.key === "ArrowRight" ? 1 : items.length - 1)) % items.length].focus();
  };

  return (
    <div class="dn-toolbar" role="toolbar" aria-label="Инструменты" onKeyDown={onKey}>
      {TOOLS.map(({ id, label }) => {
        const Icon = ICON[id];
        const open = sheet === id;
        return (
          <button
            key={id}
            type="button"
            class="dn-tool"
            data-tool={id}
            aria-pressed={open}
            aria-controls={open ? sheetId(id) : undefined}
            onClick={() => (ui.sheet.value = open && !wide() ? null : id)}
          >
            <Icon size={21} />
            <span class="dn-tool-label">{label}</span>
          </button>
        );
      })}
      <button type="button" class="dn-save" onClick={() => saveFlow.open()}>
        <span class="dn-save-pill">Сохранить</span>
      </button>
    </div>
  );
}
