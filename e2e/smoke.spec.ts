import { expect, test } from "@playwright/test";

test.describe("каркас", () => {
  test("главная открывается: lang=ru, есть #constructor, без запросов к серверу приложения", async ({ page }) => {
    const calls: string[] = [];
    page.on("request", (r) => {
      if (["fetch", "xhr", "websocket", "eventsource"].includes(r.resourceType())) calls.push(r.url());
    });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("./");
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
    await expect(page.locator("#constructor")).toBeVisible();
    await expect(page).toHaveTitle(/Diva Nails/);
    await page.waitForLoadState("networkidle");
    expect(calls).toEqual([]);
    expect(errors).toEqual([]);
  });

  test("главная пререндерена: #constructor есть в HTML до JS", async ({ request }) => {
    const res = await request.get("./");
    expect(res.ok()).toBe(true);
    expect(await res.text()).toContain('id="constructor"');
  });

  // Коды формата v1 для дизайнов из data/designs.json (idx оттенков стабильны, коды не меняются).
  const CRANBERRY = "ASAOgAdAA6AB0ADoAA"; // «Клюквенный глянец»

  test("ссылка на дизайн /d/#d=… открывает конструктор, дизайн остаётся в адресе", async ({ page }) => {
    await page.goto(`./d/#d=${CRANBERRY}`);
    await expect(page).toHaveTitle(/Посмотри мой дизайн маникюра/);
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
    await expect(page.locator("#constructor")).toBeVisible();
    await page.reload();
    await expect(page.locator("#constructor")).toBeVisible();
    expect(await page.evaluate(() => location.hash)).toBe(`#d=${CRANBERRY}`);
  });

  test("битая ссылка — дизайн месяца, в адресе уже его код", async ({ page }) => {
    // дизайн месяца меняется каждый месяц — сверяем руку с главной без ссылки, а не конкретный код
    const nailLabels = () => page.locator("#constructor [data-nail]").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
    await page.goto("./");
    await expect(page.locator("#constructor [data-nail]").first()).toBeVisible();
    const month = await nailLabels();
    await page.goto("about:blank"); // иначе смена одного #… — без перезагрузки
    await page.goto("./#d=garbage!");
    await expect(page.locator("#constructor")).toBeVisible();
    await expect.poll(() => page.evaluate(() => location.hash)).toMatch(/^#d=[A-Za-z0-9_-]+$/);
    expect(await nailLabels()).toEqual(month);
    // код в адресе открывает ту же руку
    await page.goto(`./d/${await page.evaluate(() => location.hash)}`);
    await expect.poll(nailLabels).toEqual(month);
  });

  test("политика конфиденциальности открывается", async ({ page }) => {
    await page.goto("./privacy/");
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Политика конфиденциальности");
  });
});
