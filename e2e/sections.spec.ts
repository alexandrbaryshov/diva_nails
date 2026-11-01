import { expect, test, type Page } from "@playwright/test";

// Секции под конструктором в настоящих движках: лента/плитка, просмотр фото, аккордеон, кнопки ≥ 44 px.

const isWide = (page: Page) => (page.viewportSize()?.width ?? 0) >= 900;

test.describe("секции страницы", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("./");
    await expect(page.locator("#works")).toBeAttached();
  });

  test("нет горизонтальной прокрутки страницы", async ({ page }) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("«Работы»: лента со свайпом на телефоне, плитка на компьютере", async ({ page }) => {
    const list = page.locator(".works-list");
    await list.scrollIntoViewIfNeeded();
    const info = await list.evaluate((el) => ({
      scrolls: el.scrollWidth > el.clientWidth + 8,
      tops: [...el.children].map((c) => Math.round((c as HTMLElement).getBoundingClientRect().top)),
    }));
    if (isWide(page)) {
      expect(info.scrolls).toBe(false);
      expect(new Set(info.tops).size).toBeGreaterThan(1); // несколько рядов
    } else {
      expect(info.scrolls).toBe(true);
    }
    await expect(page.locator(".work .pending").first()).toHaveText("уточняется");
  });

  test("просмотр фото: открывается, листается стрелками, Esc закрывает и возвращает фокус", async ({ page }) => {
    const opener = page.locator(".work-open").first();
    await opener.scrollIntoViewIfNeeded();
    await opener.click();
    const dialog = page.getByRole("dialog", { name: "Просмотр работы" });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(".viewer-count")).toHaveText(/^1 из \d+$/);
    await page.keyboard.press("ArrowRight");
    await expect(dialog.locator(".viewer-count")).toHaveText(/^2 из \d+$/);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test("«Хочу так же» открывает выбор записи", async ({ page }) => {
    const want = page.getByRole("button", { name: "Хочу так же" }).first();
    await want.scrollIntoViewIfNeeded();
    await want.click();
    await expect(page.getByRole("dialog", { name: "Записаться" })).toBeVisible();
  });

  test("из просмотрщика можно перейти к онлайн-записи и вернуть фокус", async ({ page }) => {
    const opener = page.locator(".work-open").first();
    await opener.click();
    const viewer = page.getByRole("dialog", { name: "Просмотр работы" });
    await viewer.getByRole("button", { name: "Хочу так же" }).click();
    await expect(viewer).toBeHidden();
    const booking = page.getByRole("dialog", { name: "Записаться" });
    await booking.getByRole("button", { name: /Выбрать время онлайн/ }).click();
    await expect(booking.getByRole("status")).toContainText("Онлайн-запись скоро появится");
    await booking.getByRole("button", { name: "Закрыть", exact: true }).click();
    await expect(opener).toBeFocused();
  });

  test("«Нарисовать в конструкторе» у мужского сервиса открывает мужскую руку наверху", async ({ page }) => {
    const row = page.locator("[data-category='men']");
    await row.scrollIntoViewIfNeeded();
    await row.getByRole("button", { name: "Нарисовать в конструкторе" }).click();
    await expect(page.locator("#constructor")).toHaveAttribute("data-hand", "his");
    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBeLessThan(20);
  });

  test("вопросы: аккордеон с клавиатуры", async ({ page }) => {
    const first = page.locator(".faq-q").first();
    await first.scrollIntoViewIfNeeded();
    await first.focus();
    await page.keyboard.press("Enter");
    await expect(first).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator(".faq-a").first()).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await expect(page.locator(".faq-q").nth(1)).toBeFocused();
  });

  test("карта грузится при подходе к блоку: сверху её нет, у контактов — есть iframe или карточка адреса", async ({ page }) => {
    await expect(page.locator(".map iframe")).toHaveCount(0);
    await page.locator("#contacts").scrollIntoViewIfNeeded();
    await expect(page.locator(".map iframe, .map [data-map-fallback]").first()).toBeAttached({ timeout: 20_000 });
    await expect(page.getByRole("link", { name: "Открыть в Яндекс Картах" }).or(page.locator(".map iframe"))).toBeVisible();
  });

  test("кнопки и ссылки в секциях не меньше 44 px по высоте", async ({ page }) => {
    const small = await page.evaluate(() => {
      const out: string[] = [];
      document.querySelectorAll<HTMLElement>("main section .btn, .faq-q, .work-open, .rating-badge, .site-footer a").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.height > 0 && r.height < 43.5 && !el.closest("p")) out.push(`${el.className || el.tagName}: ${Math.round(r.height)}`);
      });
      return out;
    });
    expect(small).toEqual([]);
  });

  test("якоря шапки ведут к секциям", async ({ page }) => {
    for (const id of ["works", "prices", "for-him", "visit", "reviews", "contacts"]) {
      await expect(page.locator(`section#${id}`)).toBeAttached();
    }
  });
});
