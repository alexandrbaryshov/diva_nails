import { cleanup, fireEvent, render, screen, within } from "@testing-library/preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Constructor } from "../src/constructor/Constructor";
import { MONTH_PRESET } from "../src/data/designs";
import { HER_SHADES, HIS_SHADES, shadeLabel } from "../src/data/palette";
import { naturalDesign } from "../src/state/design";
import { createDesignStore, type DesignStore } from "../src/state/store";
import paletteData from "../data/palette.json";

let s: DesignStore;
beforeEach(() => {
  s = createDesignStore(MONTH_PRESET.design);
  render(<Constructor store={s} />);
});
afterEach(cleanup);

const nails = () => screen.getAllByRole("button").filter((b) => b.hasAttribute("data-nail"));
const tool = (name: string) => within(screen.getByRole("toolbar", { name: "Инструменты" })).getByRole("button", { name });
const panel = (name: string) => screen.getByRole("region", { name });

describe("первый экран", () => {
  it("тексты макета, пять ногтей-кнопок, лента и панель инструментов", () => {
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Нарисуй мечту — мы сделаем");
    expect(screen.getByText("нажми на ноготь для выбора")).toBeTruthy();
    expect(screen.getByText("Дизайн месяца")).toBeTruthy();
    expect(nails()).toHaveLength(5);
    for (const name of ["Цвет", "Эффект", "Дизайн", "Форма", "Картинка", "Сохранить"]) expect(tool(name)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Её" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Его" }).getAttribute("aria-pressed")).toBe("false");
    // до первого действия отменять нечего — кнопок истории нет
    expect(screen.queryByRole("button", { name: "Отменить" })).toBeNull();
  });
});

describe("цвет", () => {
  it("эффект, удалённый из доступного набора данных, не предлагается", () => {
    const data = paletteData as unknown as { effects?: { id: string; stub: boolean }[] };
    const previous = data.effects;
    data.effects = [{ id: "gloss", stub: true }];
    try {
      fireEvent.click(tool("Эффект"));
      expect(within(panel("Эффект")).queryByRole("button", { name: "Хром" })).toBeNull();
      expect(within(panel("Эффект")).getByText("Палитра студии уточняется — подписи временные")).toBeTruthy();
    } finally { data.effects = previous; }
  });
  it("тап по ногтю выбирает его и открывает «Цвет»; оттенок красит выбранный ноготь", () => {
    fireEvent.click(nails()[1]);
    expect(s.selected.value).toBe(1);
    expect(nails()[1].getAttribute("aria-pressed")).toBe("true");
    const p = panel("Цвет");
    fireEvent.click(within(p).getByRole("button", { name: "DN 29 · Клюква" }));
    expect(s.design.value.nails[1].shade).toBe("DN29");
    expect(s.design.value.nails[0].shade).toBe(MONTH_PRESET.design.nails[0].shade);
  });

  it("у каждого оттенка видна подпись; пометка о временной палитре", () => {
    fireEvent.click(tool("Цвет"));
    const p = panel("Цвет");
    for (const shade of HER_SHADES) expect(within(p).getByText(shadeLabel(shade))).toBeTruthy();
    expect(within(p).getByText("Палитра студии уточняется — подписи временные")).toBeTruthy();
  });

  it("«На все ногти» красит пять", () => {
    fireEvent.click(nails()[3]);
    fireEvent.click(within(panel("Цвет")).getByRole("button", { name: "DN 18 · Пион" }));
    fireEvent.click(within(panel("Цвет")).getByRole("button", { name: "На все ногти" }));
    expect(s.design.value.nails.map((n) => n.shade)).toEqual(["DN18", "DN18", "DN18", "DN18", "DN18"]);
  });

  it("Enter на ногте открывает «Цвет», стрелки переводят между ногтями", () => {
    nails()[2].focus();
    fireEvent.keyDown(nails()[2], { key: "Enter" });
    expect(s.selected.value).toBe(2);
    expect(panel("Цвет")).toBeTruthy();
  });
});

describe("эффект, дизайн, форма", () => {
  it("эффект ложится на выбранный ноготь и на все", () => {
    fireEvent.click(nails()[0]);
    fireEvent.click(tool("Эффект"));
    const p = panel("Эффект");
    for (const name of ["Глянец", "Матовое", "Хром", "Втирка", "Кошачий глаз", "Блёстки", "Градиент"]) expect(within(p).getByRole("button", { name })).toBeTruthy();
    fireEvent.click(within(p).getByRole("button", { name: "Кошачий глаз" }));
    expect(s.design.value.nails[0].effect).toBe("cat-eye");
    fireEvent.click(within(p).getByRole("button", { name: "На все ногти" }));
    expect(s.design.value.nails.every((n) => n.effect === "cat-eye")).toBe(true);
  });

  it("узор и декор: положить, убрать", () => {
    fireEvent.click(nails()[2]);
    fireEvent.click(tool("Дизайн"));
    const p = panel("Дизайн");
    fireEvent.click(within(p).getByRole("button", { name: "Сердечки" }));
    expect(s.design.value.nails[2].pattern).toBe("hearts");
    fireEvent.click(within(p).getByRole("button", { name: "Жемчужина" }));
    expect(s.design.value.nails[2].decor.map((d) => d.item)).toEqual(["rhinestone-pearl"]);
    fireEvent.click(within(p).getByRole("button", { name: "Убрать: Жемчужина" }));
    expect(s.design.value.nails[2].decor).toEqual([]);
  });

  it("форма и длина меняют всю руку; на длинной — «Это наращивание — сделаем»", () => {
    fireEvent.click(tool("Форма"));
    const p = panel("Форма");
    fireEvent.click(within(p).getByRole("button", { name: "Стилет" }));
    expect(s.design.value.shape).toBe("stiletto");
    expect(within(p).queryByText("Это наращивание — сделаем")).toBeNull();
    fireEvent.click(within(p).getByRole("button", { name: "Длинная" }));
    expect(s.design.value.length).toBe("long");
    expect(screen.getAllByText("Это наращивание — сделаем").length).toBeGreaterThan(0);
  });

  it("вторая рука: появляется зеркальная и убирается той же кнопкой", () => {
    fireEvent.click(tool("Форма"));
    const btn = within(panel("Форма")).getByRole("button", { name: "Повторить на второй руке" });
    fireEvent.click(btn);
    expect(s.design.value.twoHands).toBe(true);
    expect(document.querySelectorAll("[data-mirrored]")).toHaveLength(1);
    fireEvent.click(within(panel("Форма")).getByRole("button", { name: "Повторить на второй руке" }));
    expect(s.design.value.twoHands).toBe(false);
    expect(document.querySelectorAll("[data-mirrored]")).toHaveLength(0);
  });
});

describe("история", () => {
  it("↶ ↷ и «Сбросить»; Ctrl+Z / Ctrl+Shift+Z", () => {
    fireEvent.click(nails()[4]);
    fireEvent.click(within(panel("Цвет")).getByRole("button", { name: "DN 39 · Чёрный" }));
    expect(s.design.value.nails[4].shade).toBe("DN39");
    fireEvent.click(screen.getByRole("button", { name: "Отменить" }));
    expect(s.design.value.nails[4].shade).toBe(MONTH_PRESET.design.nails[4].shade);
    fireEvent.click(screen.getByRole("button", { name: "Вернуть" }));
    expect(s.design.value.nails[4].shade).toBe("DN39");
    fireEvent.keyDown(document, { key: "z", ctrlKey: true });
    expect(s.design.value.nails[4].shade).toBe(MONTH_PRESET.design.nails[4].shade);
    fireEvent.keyDown(document, { key: "Z", ctrlKey: true, shiftKey: true });
    expect(s.design.value.nails[4].shade).toBe("DN39");
    fireEvent.click(screen.getByRole("button", { name: "Сбросить" }));
    expect(s.design.value.nails).toEqual(naturalDesign("her").nails);
    fireEvent.keyDown(document, { key: "z", ctrlKey: true });
    expect(s.design.value.nails[4].shade).toBe("DN39");
  });
});

describe("её и его, тон кожи", () => {
  it("«Его»: мужская рука, только мужской набор и короткие формы", () => {
    fireEvent.click(screen.getByRole("button", { name: "Его" }));
    expect(s.design.value.hand).toBe("his");
    fireEvent.click(tool("Цвет"));
    const colors = within(panel("Цвет"));
    for (const shade of HIS_SHADES) expect(colors.getByRole("button", { name: shadeLabel(shade) })).toBeTruthy();
    expect(colors.queryByRole("button", { name: "DN 29 · Клюква" })).toBeNull();
    fireEvent.click(tool("Форма"));
    const shape = within(panel("Форма"));
    expect(shape.queryByRole("button", { name: "Стилет" })).toBeNull();
    expect(shape.queryByRole("button", { name: "Длинная" })).toBeNull();
    expect(shape.getByRole("button", { name: "Мягкий квадрат" })).toBeTruthy();
    // спокойнее: без сердечек и страз
    fireEvent.click(tool("Дизайн"));
    expect(within(panel("Дизайн")).queryByRole("button", { name: "Сердечки" })).toBeNull();
    expect(document.body.textContent).not.toMatch(/ноготоч|♥|❤/);
  });

  it("тон кожи — четыре шага, ногти не меняются", () => {
    const tone = screen.getByRole("slider", { name: "Тон кожи" });
    expect(tone.getAttribute("aria-valuemin")).toBe("0");
    expect(tone.getAttribute("aria-valuemax")).toBe("3");
    const before = JSON.stringify(s.design.value.nails);
    fireEvent.keyDown(tone, { key: "ArrowRight" });
    expect(s.design.value.tone).toBe(2);
    fireEvent.keyDown(tone, { key: "End" });
    expect(s.design.value.tone).toBe(3);
    expect(JSON.stringify(s.design.value.nails)).toBe(before);
  });
});

describe("сохранить", () => {
  it("«Сохранить» открывает сохранение карточки", async () => {
    const card = await import("../src/card/index");
    const open = vi.spyOn(card.saveFlow, "open");
    fireEvent.click(tool("Сохранить"));
    expect(open).toHaveBeenCalled();
  });
});
