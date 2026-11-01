import { cleanup, fireEvent, render, screen } from "@testing-library/preact";
import { h } from "preact";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as analytics from "../src/analytics";
import { BookingSheet } from "../src/booking/BookingSheet";
import { openTelegram, telegramText, telegramUrl } from "../src/booking/telegram";
import { MONTH_PRESET, PRESETS } from "../src/data/designs";
import { STUDIO } from "../src/data/studio";
import { naturalDesign, type Design } from "../src/state/design";

import { cardLines } from "../src/card/lines";
import { nailDescription } from "../src/constructor/HandView";
import { createDesignStore } from "../src/state/store";

afterEach(cleanup);

const URL_ = "https://alexandrbaryshov.github.io/diva-nails/d/#d=ABC";

function allNails(d: Design, patch: Partial<Design["nails"][number]>): Design {
  return { ...d, nails: d.nails.map((n) => ({ ...n, ...patch })) as Design["nails"] };
}

describe("telegramText — текст записи из дизайна", () => {
  it("как в брифе: форма, длина, оттенок + эффект, ссылка", () => {
    const d = allNails({ ...naturalDesign("her"), shape: "almond", length: "medium" }, { shade: "DN29", effect: "chrome" });
    expect(telegramText(d, URL_)).toBe(
      `Привет! Хочу записаться: миндаль, средняя длина, DN 29 · Клюква + хром. Мой дизайн: ${URL_}`,
    );
  });

  it("общий оттенок с узором и отдельный ноготь", () => {
    const base = allNails({ ...naturalDesign("her"), shape: "almond", length: "medium" }, { shade: "DN01", effect: "gloss", pattern: "french", accent: "DN23" });
    const d: Design = { ...base, nails: base.nails.map((n, i) => (i === 3 ? { ...n, shade: "DN23", effect: "chrome", pattern: "none", accent: null } : n)) as Design["nails"] };
    expect(telegramText(d, URL_)).toBe(
      `Привет! Хочу записаться: миндаль, средняя длина, DN 01 · Молочный, френч; безымянный — DN 23 · Вишнёвый мокко + хром. Мой дизайн: ${URL_}`,
    );
  });

  it("натуральные ногти — «без покрытия»; глянец не называется", () => {
    expect(telegramText(naturalDesign("her"), URL_)).toBe(
      `Привет! Хочу записаться: овал, короткая длина, без покрытия. Мой дизайн: ${URL_}`,
    );
  });

  it("Капучино мат → мужская рука: натуральные ногти описаны без покрытия, выбранный эффект сохранён", () => {
    const store = createDesignStore(naturalDesign());
    store.load(PRESETS.find((preset) => preset.id === "cappuccino-matte")!.design);
    expect(telegramText(store.design.value, URL_)).toContain("+ матовое");
    expect(cardLines(store.design.value)[0].text).toContain(", матовое");

    store.setHand("his");
    const natural = store.design.value;
    expect(natural.nails.every((nail) => nail.shade === null && nail.effect === "matte")).toBe(true);
    expect(nailDescription(natural, 0)).toBe("Большой: натуральный, без покрытия");
    expect(cardLines(natural).map((line) => line.text)).toEqual(Array(5).fill("без покрытия"));
    expect(telegramText(natural, URL_)).toBe(
      `Привет! Хочу записаться: мужской маникюр, овал, короткая длина, без покрытия. Мой дизайн: ${URL_}`,
    );

    store.paint("all", "DNM2");
    expect(cardLines(store.design.value)[0].text).toBe("DN M2 · Матовое укрепление");
    expect(telegramText(store.design.value, URL_)).toContain("DN M2 · Матовое укрепление");
    store.setHand("her");
    store.paint("all", "DN12");
    expect(telegramText(store.design.value, URL_)).toContain("+ матовое");
    expect(cardLines(store.design.value)[0].text).toContain(", матовое");
  });

  it("мужская рука — спокойно, без лишнего: эффект оттенка набора не повторяется", () => {
    const d = allNails(naturalDesign("his"), { shade: "DNM2", effect: "matte" });
    expect(telegramText(d, URL_)).toBe(
      `Привет! Хочу записаться: мужской маникюр, мягкий квадрат, короткая длина, DN M2 · Матовое укрепление. Мой дизайн: ${URL_}`,
    );
  });

  it("без дизайна — просто привет", () => {
    expect(telegramText(null, URL_)).toBe("Привет! Хочу записаться.");
  });

  it("ссылка t.me/divanail21 с текстом", () => {
    expect(telegramUrl("Привет! Хочу")).toBe(`${STUDIO.telegram.url}?text=${encodeURIComponent("Привет! Хочу")}`);
    expect(STUDIO.telegram.url).toBe("https://t.me/divanail21");
  });
});

describe("openTelegram", () => {
  it("сначала кладёт текст в буфер, потом открывает t.me с текстом", async () => {
    const order: string[] = [];
    const writeText = vi.fn(async (t: string) => {
      order.push(`copy:${t}`);
    });
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const open = vi.spyOn(window, "open").mockImplementation((u) => {
      order.push(`open:${String(u)}`);
      return null;
    });
    await openTelegram("Привет!");
    expect(writeText).toHaveBeenCalledWith("Привет!");
    expect(order[0]).toBe("copy:Привет!");
    expect(order[1]).toBe(`open:${telegramUrl("Привет!")}`);
    open.mockRestore();
  });
});

describe("BookingSheet — выбор записи", () => {
  it("два пути: Telegram с готовым текстом и онлайн-запись «уточняется»", async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const goal = vi.spyOn(analytics, "goal");
    render(h(BookingSheet, { open: true, onClose: () => {}, design: MONTH_PRESET.design }));

    const tg = screen.getByRole("link", { name: /Написать в Telegram/ });
    expect(tg.getAttribute("href")).toMatch(/^https:\/\/t\.me\/divanail21\?text=/);
    expect(decodeURIComponent(tg.getAttribute("href")!.split("?text=")[1])).toMatch(/^Привет! Хочу записаться: .+\. Мой дизайн: https:\/\//);
    tg.addEventListener("click", (e) => e.preventDefault());
    fireEvent.click(tg);
    expect(writeText).toHaveBeenCalled();
    expect(await screen.findByText("Текст скопирован — вставь в чат, если не подставился")).toBeTruthy();
    expect(goal).toHaveBeenCalledWith("book_telegram");

    const online = screen.getByRole("link", { name: /Выбрать время онлайн/ });
    expect(online.getAttribute("href")).toBe("https://n295040.yclients.com/company/285468/record-type?o=");
    fireEvent.click(online);
    
    expect(goal).toHaveBeenCalledWith("book_yclients");
  });

  it("закрыт — ничего не рисует", () => {
    const { container } = render(h(BookingSheet, { open: false, onClose: () => {} }));
    expect(container.textContent).toBe("");
  });
});
