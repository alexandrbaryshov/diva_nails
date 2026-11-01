import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Constructor } from "../src/constructor/Constructor";
import { MONTH_PRESET, PRESETS } from "../src/data/designs";
import { HER_SHADES, HIS_SHADES } from "../src/data/palette";
import { naturalDesign } from "../src/state/design";
import { createDesignStore, type DesignStore } from "../src/state/store";

let s: DesignStore;
afterEach(() => {
  cleanup();
  history.replaceState(null, "", "/diva-nails/");
});

function mount(initial = MONTH_PRESET.design) {
  s = createDesignStore(initial);
  render(<Constructor store={s} />);
}

const strip = () => screen.getByRole("region", { name: /Дизайн месяца|Мужской набор/ });
const presetCards = () => within(strip()).getAllByRole("button").filter((b) => b.classList.contains("dn-card--preset"));

describe("лента «Дизайн месяца»", () => {
  beforeEach(() => mount(naturalDesign("her")));

  it("все дизайны сезона, первый — дизайн месяца; любой применяется и правится дальше", () => {
    const cards = presetCards();
    expect(cards).toHaveLength(PRESETS.length);
    expect(PRESETS.length).toBeGreaterThanOrEqual(12);
    expect(PRESETS.length).toBeLessThanOrEqual(15);
    expect(cards[0].getAttribute("aria-label")).toBe(`Дизайн месяца: ${MONTH_PRESET.title}`);
    s.setTone(3);
    const pick = PRESETS.find((p) => p.id === "peony-gradient")!;
    fireEvent.click(cards.find((c) => c.getAttribute("aria-label") === pick.title)!);
    expect(s.design.value.nails).toEqual(pick.design.nails);
    expect(s.design.value.shape).toBe(pick.design.shape);
    expect(s.design.value.tone).toBe(3); // тон кожи — свой
    s.paint(0, "DN39");
    expect(s.design.value.nails[0].shade).toBe("DN39");
    s.undo();
    s.undo();
    expect(s.design.value.nails).toEqual(naturalDesign("her").nails);
  });

  it("стрелки клавиатуры листают ленту", () => {
    const cards = presetCards();
    cards[0].focus();
    fireEvent.keyDown(cards[0], { key: "ArrowRight" });
    expect(document.activeElement).toBe(cards[1]);
    fireEvent.keyDown(cards[1], { key: "ArrowLeft" });
    expect(document.activeElement).toBe(cards[0]);
  });

  it("«Подбери мне»: повод → настроение → длина → три разных дизайна, каждый открывается", () => {
    fireEvent.click(within(strip()).getByRole("button", { name: "Подбери мне" }));
    const quiz = () => screen.getByRole("region", { name: "Подбери мне" });
    for (const o of ["Офис", "Свидание", "Свадьба", "Отпуск", "Праздник"]) expect(within(quiz()).getByRole("button", { name: o })).toBeTruthy();
    fireEvent.click(within(quiz()).getByRole("button", { name: "Праздник" }));
    for (const m of ["Нежно", "Ярко", "Дерзко"]) expect(within(quiz()).getByRole("button", { name: m })).toBeTruthy();
    fireEvent.click(within(quiz()).getByRole("button", { name: "Дерзко" }));
    for (const l of ["Короткие", "Средние", "Длинные"]) expect(within(quiz()).getByRole("button", { name: l })).toBeTruthy();
    fireEvent.click(within(quiz()).getByRole("button", { name: "Длинные" }));
    const results = within(quiz()).getAllByRole("button").filter((b) => b.classList.contains("dn-quiz-result"));
    expect(results).toHaveLength(3);
    const titles = results.map((r) => r.textContent);
    expect(new Set(titles).size).toBe(3);
    // праздник + дерзко + длинные: в ленте ровно три таких (data/designs.json)
    const expected = ["cherry-cat-eye", "bordeaux-gold", "black-chrome"].map((id) => PRESETS.find((p) => p.id === id)!);
    expect(new Set(titles)).toEqual(new Set(expected.map((p) => p.title)));
    const chosen = expected.find((p) => p.title === results[1].textContent)!;
    fireEvent.click(results[1]);
    expect(s.design.value.nails).toEqual(chosen.design.nails);
    expect(screen.queryByRole("region", { name: "Подбери мне" })).toBeNull();
  });

  it("«Удиви меня» — только оттенки палитры, два подряд разные", () => {
    const btn = within(strip()).getByRole("button", { name: "Удиви меня" });
    const ids = new Set(HER_SHADES.map((x) => x.id));
    let prev = JSON.stringify(s.design.value.nails);
    for (let k = 0; k < 10; k++) {
      fireEvent.click(btn);
      const now = s.design.value;
      for (const n of now.nails) {
        if (n.shade) expect(ids.has(n.shade)).toBe(true);
        if (n.accent) expect(ids.has(n.accent)).toBe(true);
      }
      const key = JSON.stringify([now.shape, now.length, now.nails]);
      expect(key).not.toBe(prev);
      prev = key;
    }
  });
});

describe("лента на мужской руке", () => {
  beforeEach(() => mount(naturalDesign("his")));

  it("«Мужской набор»: четыре покрытия, без «Подбери мне»; «Удиви меня» — только мужской набор", () => {
    expect(within(strip()).getByRole("heading").textContent).toBe("Мужской набор");
    expect(within(strip()).queryByRole("button", { name: "Подбери мне" })).toBeNull();
    const cards = presetCards();
    expect(cards.map((c) => c.getAttribute("aria-label"))).toEqual(HIS_SHADES.map((x) => x.name));
    fireEvent.click(cards[3]);
    expect(s.design.value.nails.every((n) => n.shade === HIS_SHADES[3].id)).toBe(true);
    fireEvent.click(within(strip()).getByRole("button", { name: "Удиви меня" }));
    const his = new Set(HIS_SHADES.map((x) => x.id));
    for (const n of s.design.value.nails) expect(n.shade === null || his.has(n.shade)).toBe(true);
    expect(s.design.value.hand).toBe("his");
  });
});

describe("режим автора", () => {
  it("с ?author=1 — «Экспорт дизайна в JSON» копирует запись формата designs.json", async () => {
    history.replaceState(null, "", "/diva-nails/?author=1");
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    mount();
    s.paint(2, "DN18");
    fireEvent.click(await screen.findByRole("button", { name: "Экспорт дизайна в JSON" }));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const entry = JSON.parse((writeText.mock.calls[0] as unknown as [string])[0]);
    expect(Object.keys(entry).sort()).toEqual(Object.keys(PRESETS[1]).sort());
    expect(Object.keys(entry.tags).sort()).toEqual(["length", "mood", "occasion"]);
    expect(entry.design).toEqual(s.design.value);
  });

  it("без ?author=1 кнопки нет", () => {
    mount();
    expect(screen.queryByRole("button", { name: "Экспорт дизайна в JSON" })).toBeNull();
  });
});
