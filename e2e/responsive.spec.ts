import { expect, test, type Page } from "@playwright/test";

// Адаптив и бюджет загрузки: 360, 390 и 1280–1600, без горизонтальной прокрутки, ленивые картинки.

const noSideScroll = (page: Page) =>
  page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, view: document.documentElement.clientWidth }));

async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    const step = Math.floor(window.innerHeight * 0.8);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
  });
}

const SIZES = [
  { width: 360, height: 640, wide: false },
  { width: 390, height: 664, wide: false },
  { width: 1280, height: 800, wide: true },
  { width: 1440, height: 900, wide: true },
  { width: 1600, height: 900, wide: true },
];

for (const size of SIZES) {
  test(`${size.width}×${size.height}: нет горизонтальной прокрутки, ногти видны, заголовок на месте`, async ({ page, isMobile }) => {
    test.skip(size.wide === !!isMobile, size.wide ? "широкие экраны — компьютер" : "узкие экраны — телефоны");
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.goto("./");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Нарисуй мечту — мы сделаем");
    for (let i = 0; i < 5; i++) {
      const b = (await page.locator(`#constructor .dn-hand:not(.dn-hand--mirror) [data-nail="${i}"]`).boundingBox())!;
      expect(b.x, `ноготь ${i}`).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width, `ноготь ${i}`).toBeLessThanOrEqual(size.width);
      expect(b.y + b.height, `ноготь ${i}`).toBeLessThanOrEqual(size.height);
    }
    await scrollThrough(page);
    const w = await noSideScroll(page);
    expect(w.scroll, "ширина страницы").toBeLessThanOrEqual(w.view);
    await page.evaluate(() => window.scrollTo(0, 0));
  });
}

test("всё ниже конструктора ленивое: loading=lazy, часть картинок не грузится до прокрутки, потом грузятся", async ({ page }) => {
  const media = new Set<string>();
  page.on("request", (r) => {
    if (/\/media\/.+\.(avif|webp)/.test(r.url())) media.add(r.url());
  });
  await page.goto("./");
  await page.waitForLoadState("networkidle");
  // у каждой картинки секций — loading="lazy" (картинки конструктора — SVG, их здесь нет)
  const imgs = await page.locator("main img").evaluateAll((els) => els.map((e) => ({ lazy: e.getAttribute("loading"), inHero: !!e.closest("#constructor") })));
  const below = imgs.filter((i) => !i.inHero);
  expect(below.length).toBeGreaterThan(5);
  expect(below.every((i) => i.lazy === "lazy")).toBe(true);
  // браузер подгружает картинки чуть впереди окна, но до прокрутки приходит не всё
  const before = media.size;
  const total = await page.evaluate(() => new Set([...document.querySelectorAll("main picture source, main img")].map((e) => (e as HTMLImageElement).currentSrc || e.getAttribute("srcset") || "")).size);
  expect(before, "до прокрутки загружены все картинки").toBeLessThan(total);
  await scrollThrough(page);
  await expect.poll(() => media.size).toBeGreaterThan(before);
});
test("ссылка «Политика конфиденциальности» в подвале — зона касания не меньше 44 px", async ({ page }) => {
  await page.goto("./");
  const link = page.getByRole("link", { name: "Политика конфиденциальности" });
  await link.scrollIntoViewIfNeeded();
  const b = (await link.boundingBox())!;
  expect(b.height).toBeGreaterThanOrEqual(44);
});
