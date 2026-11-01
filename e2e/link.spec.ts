import { expect, test, type Page } from "@playwright/test";

// Ссылка на дизайн: /d/#d=… открывает ту же руку; превью для мессенджеров; предупреждение про картинку.

const nail = (page: Page, i: number) => page.locator(`#constructor .dn-hand:not(.dn-hand--mirror) [data-nail="${i}"]`);
const tools = (page: Page) => page.getByRole("toolbar", { name: "Инструменты" });
const dialog = (page: Page) => page.getByRole("dialog", { name: "Карточка-бриф", exact: true });

test.describe("ссылка на дизайн", () => {
  test("страница /d/ — свои OG-теги, открывает ту же живую руку", async ({ page }) => {
    await page.goto("./");
    await nail(page, 1).click();
    await page.getByRole("region", { name: "Цвет", exact: true }).getByRole("button", { name: "DN 29 · Клюква" }).click();
    const labels = await page.locator("#constructor .dn-hand [data-nail]").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
    const hash = await page.evaluate(() => location.hash);

    await page.goto(`./d/${hash}`);
    for (let i = 0; i < 5; i++) await expect(nail(page, i)).toHaveAttribute("aria-label", labels[i]!);
    expect(await page.title()).toBe("Посмотри мой дизайн маникюра — Diva Nails");
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", "Посмотри мой дизайн маникюра — Diva Nails");
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /\/diva-nails\/og\/design\.png$/);
    await expect(page.locator(".dn-notice")).toHaveCount(0);
  });

  test("«Скопировать ссылку»: подтверждение; с референсом — честное предупреждение", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __copied: string[] }).__copied = [];
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: (t: string) => ((window as unknown as { __copied: string[] }).__copied.push(t), Promise.resolve()) },
      });
    });
    await page.goto("./");
    await page.waitForLoadState("networkidle");
    await tools(page).getByRole("button", { name: "Сохранить", exact: true }).click();
    await expect(dialog(page)).toBeVisible({ timeout: 20_000 });
    await dialog(page).getByRole("button", { name: "Скопировать ссылку" }).click();
    await expect(dialog(page).getByRole("status")).toHaveText("Ссылка скопирована — отправь подруге");
    expect(await page.evaluate(() => (window as unknown as { __copied: string[] }).__copied[0])).toMatch(/^https:\/\/alexandrbaryshov\.github\.io\/diva-nails\/d\/#d=[A-Za-z0-9_-]+$/);
    await dialog(page).getByRole("button", { name: "Закрыть" }).click();

    await tools(page).getByRole("button", { name: "Картинка", exact: true }).click();
    const png = await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = c.height = 120;
      c.getContext("2d")!.fillRect(0, 0, 120, 120);
      return c.toDataURL("image/png").split(",")[1];
    });
    await page.locator('input[data-picture="reference"]').setInputFiles({ name: "pin.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
    await tools(page).getByRole("button", { name: "Сохранить", exact: true }).click();
    await expect(dialog(page)).toBeVisible({ timeout: 20_000 });
    await dialog(page).getByRole("button", { name: "Скопировать ссылку" }).click();
    await expect(dialog(page).getByRole("status")).toHaveText("Ссылка скопирована — отправь подруге. Картинка по ссылке не передаётся — она есть на карточке");
  });

  test("без доступа к буферу — поле с выделенной ссылкой", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
      document.execCommand = () => false;
    });
    await page.goto("./");
    await tools(page).getByRole("button", { name: "Сохранить", exact: true }).click();
    await expect(dialog(page)).toBeVisible({ timeout: 20_000 });
    await dialog(page).getByRole("button", { name: "Скопировать ссылку" }).click();
    const field = dialog(page).getByRole("textbox", { name: "Ссылка на дизайн" });
    await expect(field).toHaveValue(/^https:\/\/alexandrbaryshov\.github\.io\/diva-nails\/d\/#d=/);
    expect(await field.evaluate((el: HTMLInputElement) => el.selectionEnd! - el.selectionStart!)).toBe((await field.inputValue()).length);
  });
});

