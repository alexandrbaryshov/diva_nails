import { expect, test, type Page } from "@playwright/test";

// Поиск, превью в ссылках и Метрика — на настоящих движках, против собранного dist/.

const SITE = "https://alexandrbaryshov.github.io/diva-nails/";
const TITLE = "Маникюр и педикюр в Чебоксарах — Diva Nails, пр. Ленина, 7";
const CRANBERRY = "ASAOgAdAA6AB0ADoAA";

const content = (page: Page, sel: string) => page.locator(sel).first().getAttribute("content");

test.describe("поиск и превью", () => {
  test("главная: title, description, canonical, OG — абсолютные от адреса сайта", async ({ page }) => {
    await page.goto("./");
    await expect(page).toHaveTitle(TITLE);
    expect(await content(page, 'meta[name="description"]')).toMatch(/Diva Nails/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", SITE);
    expect(await content(page, 'meta[property="og:url"]')).toBe(SITE);
    expect(await content(page, 'meta[property="og:image"]')).toBe(`${SITE}og/main.png`);
    expect(await content(page, 'meta[property="og:title"]')).toBe(TITLE);
  });

  test("JSON-LD NailSalon есть в HTML до JS, читается и совпадает с фактами", async ({ request }) => {
    const html = await (await request.get("./")).text();
    const m = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html);
    expect(m, "в пререндеренной главной нет JSON-LD").toBeTruthy();
    const ld = JSON.parse(m![1]);
    expect(ld["@type"]).toBe("NailSalon");
    expect(ld.telephone).toBe("+79527590659");
    expect(ld.address.streetAddress).toBe("проспект Ленина, 7, корп. 1");
    expect(ld.address.addressLocality).toBe("Чебоксары");
    expect(ld.aggregateRating).toMatchObject({ ratingValue: "5.0", reviewCount: 162 });
    expect(ld).not.toHaveProperty("openingHours");
  });

  test("ссылка на дизайн: своё превью «Посмотри мой дизайн»", async ({ page }) => {
    await page.goto(`./d/#d=${CRANBERRY}`);
    await expect(page).toHaveTitle(/Посмотри мой дизайн маникюра/);
    expect(await content(page, 'meta[property="og:title"]')).toBe("Посмотри мой дизайн маникюра — Diva Nails");
    expect(await content(page, 'meta[property="og:url"]')).toBe(`${SITE}d/`);
    expect(await content(page, 'meta[property="og:image"]')).toBe(`${SITE}og/design.png`);
  });

  test("OG-картинки отдаются как PNG 1200×630", async ({ request }) => {
    for (const name of ["main", "design"]) {
      const res = await request.get(`og/${name}.png`);
      expect(res.ok(), name).toBe(true);
      const body = await res.body();
      expect(body.readUInt32BE(16), `${name} ширина`).toBe(1200);
      expect(body.readUInt32BE(20), `${name} высота`).toBe(630);
    }
  });
});

test.describe("Яндекс Метрика", () => {
  const ymQueue = (page: Page) =>
    page.evaluate(() => {
      const ym = (window as unknown as { ym?: { a?: IArguments[] } }).ym;
      return (ym?.a ?? []).map((a) => [...a]);
    });
  const goals = async (page: Page) => (await ymQueue(page)).filter((c) => c[1] === "reachGoal").map((c) => c[2] as string);
  const tag = (page: Page) => page.locator('script[src*="mc.yandex.ru"]');

  test("номер счётчика не задан: ни скрипта, ни уведомления, ни очереди", async ({ page }) => {
    const external: string[] = [];
    page.on("request", (r) => {
      if (/yandex\.ru/.test(r.url())) external.push(r.url());
    });
    await page.goto("./");
    await page.waitForLoadState("networkidle");
    await expect(tag(page)).toHaveCount(0);
    await expect(page.locator(".cookie")).toHaveCount(0);
    expect(await page.evaluate(() => "ym" in window)).toBe(false);
    expect(external).toEqual([]);
  });

  test("номер задан: скрипт грузится, уведомление со ссылкой на /privacy/, все 6 целей уходят", async ({ page, context }) => {
    test.setTimeout(90_000);
    await page.addInitScript(() => {
      (window as unknown as { __DN_CONFIG__: unknown }).__DN_CONFIG__ = { metrikaId: 12345678 };
    });
    // в сеть не ходим: счётчик и Telegram подменены пустыми ответами
    await context.route(/mc\.yandex\.ru|t\.me/, (route) => route.fulfill({ status: 200, contentType: "text/javascript", body: "" }));

    await page.goto("./");
    await expect(tag(page)).toHaveCount(1);
    await expect(tag(page)).toHaveAttribute("src", "https://mc.yandex.ru/metrika/tag.js");
    expect((await ymQueue(page))[0].slice(0, 2)).toEqual([12345678, "init"]);
    const notice = page.getByRole("region", { name: "Cookies" });
    await expect(notice).toBeVisible();
    await expect(notice.getByRole("link", { name: "политике конфиденциальности" })).toHaveAttribute("href", /\/privacy\/$/);
    await notice.getByRole("button", { name: "Понятно" }).click();
    await expect(notice).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("region", { name: "Cookies" })).toHaveCount(0); // «Понятно» запомнено

    // открыл конструктор → изменил ноготь → сохранил → записаться (Telegram, онлайн)
    await page.locator("#constructor [data-nail='1']").first().click();
    await page.getByRole("region", { name: "Цвет", exact: true }).getByRole("button", { name: "DN 29 · Клюква" }).click();
    await page.getByRole("toolbar", { name: "Инструменты" }).getByRole("button", { name: "Сохранить", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Карточка-бриф", exact: true })).toBeVisible({ timeout: 20_000 });
    await page.getByRole("dialog", { name: "Карточка-бриф", exact: true }).getByRole("button", { name: "Закрыть" }).first().click();
    await page.getByRole("button", { name: "Записаться" }).first().click();
    const booking = page.getByRole("dialog", { name: "Записаться" });
    await booking.getByRole("button", { name: /Выбрать время онлайн/ }).click();
    const popup = page.waitForEvent("popup", { timeout: 5000 }).catch(() => null);
    await booking.getByRole("link", { name: /Написать в Telegram/ }).click();
    await popup;
    const seen = await goals(page);
    for (const g of ["constructor_open", "nail_change", "card_save", "book_telegram", "book_yclients"]) expect(seen, g).toContain(g);

    // перешёл по ссылке на дизайн
    await page.goto(`./d/#d=${CRANBERRY}`);
    await expect.poll(() => goals(page)).toContain("design_link_open");
  });
});
