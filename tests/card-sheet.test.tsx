import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/preact";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SaveSheet } from "../src/card/SaveSheet";
import { naturalDesign } from "../src/state/design";
import { BookingSheet } from "../src/booking/BookingSheet";

afterEach(cleanup);

const URL_ = "https://alexandrbaryshov.github.io/diva-nails/d/#d=ABC";
const blob = new Blob(["x"], { type: "image/png" });

function sheet(over: Partial<Parameters<typeof SaveSheet>[0]> = {}) {
  URL.createObjectURL = vi.fn(() => "blob:card");
  URL.revokeObjectURL = vi.fn();
  return render(<SaveSheet blob={blob} design={naturalDesign("her")} url={URL_} hasImages={false} onClose={() => undefined} onRetry={() => undefined} {...over} />);
}

describe("лист после «Сохранить»", () => {
  it.each(["card", "booking"])("%s: отказ обоих способов копирования даёт готовый текст вручную", async (kind) => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) }, configurable: true });
    document.execCommand = vi.fn(() => false);
    if (kind === "card") sheet();
    else render(<BookingSheet open onClose={() => undefined} design={naturalDesign()} />);
    fireEvent.click(screen.getByRole("link", { name: kind === "card" ? "В Telegram" : /Написать в Telegram/ }));
    const field = await screen.findByRole("textbox", { name: "Текст для Telegram" });
    expect((field as HTMLTextAreaElement).value).toContain("Привет! Хочу записаться");
    expect(screen.getByRole("status").textContent).not.toContain("Текст скопирован");
  });
  it("четыре действия в порядке брифа", () => {
    sheet();
    const names = screen.getAllByRole("button").concat(screen.getAllByRole("link")).map((e) => e.textContent?.trim());
    const ordered = ["В галерею", "В Telegram", "Записаться онлайн", "Скопировать ссылку"].map((n) => names.findIndex((x) => x?.startsWith(n)));
    expect(ordered.every((i) => i >= 0)).toBe(true);
    const dom = [...document.querySelectorAll(".sv-actions > *")].map((e) => e.textContent?.trim() ?? "");
    expect(dom.map((t) => t.split(" ·")[0])).toEqual(["В галерею", "В Telegram", "Записаться онлайн", "Скопировать ссылку"]);
  });

  it("«В Telegram» — t.me с текстом и ссылкой на дизайн", () => {
    sheet();
    const href = screen.getByRole("link", { name: "В Telegram" }).getAttribute("href")!;
    expect(href.startsWith("https://t.me/divanail21?text=")).toBe(true);
    expect(decodeURIComponent(href)).toContain(`Мой дизайн: ${URL_}`);
  });

  it("копирование: «Ссылка скопирована — отправь подруге»; с картинкой — ещё и предупреждение", async () => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn().mockResolvedValue(undefined) }, configurable: true });
    sheet({ hasImages: true });
    fireEvent.click(screen.getByRole("button", { name: "Скопировать ссылку" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Ссылка скопирована — отправь подруге. Картинка по ссылке не передаётся — она есть на карточке"));
  });

  it("без доступа к буферу — поле со ссылкой", async () => {
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    document.execCommand = vi.fn(() => false);
    sheet();
    fireEvent.click(screen.getByRole("button", { name: "Скопировать ссылку" }));
    const field = await screen.findByRole("textbox", { name: "Ссылка на дизайн" });
    expect((field as HTMLInputElement).value).toBe(URL_);
  });

  it("ошибка сборки — понятная фраза и повтор", () => {
    const onRetry = vi.fn();
    sheet({ blob: null, onRetry });
    expect(screen.getByRole("alert").textContent).toBe("Не получилось собрать карточку — попробуй ещё раз");
    fireEvent.click(screen.getByRole("button", { name: "Попробовать ещё раз" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("«Онлайн-запись» без YCLIENTS — «скоро появится»", () => {
    sheet();
    expect(screen.getByRole("link", { name: /Записаться онлайн/ }).getAttribute("href")).toBe("https://n295040.yclients.com/company/285468/record-type?o=");
    
  });
});
