import { cleanup, fireEvent, render, screen, within } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";
import { BookingHost, booking } from "../src/booking";
import { Header, NAV_SECTIONS } from "../src/sections/Header";

afterEach(() => {
  booking.close();
  cleanup();
});

describe("шапка", () => {
  it("надпись Diva Nails ведёт к конструктору; меню-якоря разделов", () => {
    render(<Header />);
    const brand = screen.getByRole("link", { name: "Diva Nails" });
    expect(brand.getAttribute("href")).toBe("#constructor");
    const nav = screen.getByRole("navigation", { name: "Разделы" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((a) => a.textContent)).toEqual(["Работы", "Цены", "Для него", "Визит", "Отзывы", "Контакты"]);
    expect(links.map((a) => a.getAttribute("href"))).toEqual(NAV_SECTIONS.map((x) => `#${x.id}`));
  });

  it("«Записаться» раскрывает выбор и закрывает его; Esc тоже закрывает", () => {
    render(
      <>
        <Header />
        <BookingHost />
      </>,
    );
    const btn = screen.getByRole("button", { name: "Записаться" });
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    expect(btn.getAttribute("aria-controls")).toBe("booking-sheet");
    const sheet = screen.getByRole("dialog", { name: "Записаться" });
    expect(within(sheet).getByRole("link", { name: /Написать в Telegram/ })).toBeTruthy();
    expect(within(sheet).getByRole("link", { name: /Выбрать время онлайн/ })).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Записаться" })).toBeNull();
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(screen.queryByRole("dialog", { name: "Записаться" })).toBeNull();
  });
});
