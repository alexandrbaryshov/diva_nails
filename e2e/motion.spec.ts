import { expect, test, type Page } from "@playwright/test";

// Движение на настоящих движках: мазок, вибрация, переливы, блик за наклоном, лампа, reduced motion.

const nail = (page: Page, i: number) => page.locator(`#constructor .dn-hand:not(.dn-hand--mirror) [data-nail="${i}"]`);
const tools = (page: Page) => page.getByRole("toolbar", { name: "Инструменты" });
const sheet = (page: Page, name: string) => page.getByRole("region", { name, exact: true });

async function openTool(page: Page, name: string) {
  const btn = tools(page).getByRole("button", { name, exact: true });
  if ((await btn.getAttribute("aria-pressed")) !== "true") await btn.click();
  await expect(sheet(page, name)).toBeVisible();
}

/** Ноготь 1 — клюква; с эффектом, если он назван. */
async function paintNail(page: Page, effect?: string) {
  await nail(page, 1).click();
  await expect(sheet(page, "Цвет")).toBeVisible();
  await sheet(page, "Цвет").getByRole("button", { name: "DN 29 · Клюква" }).click();
  if (effect) {
    await openTool(page, "Эффект");
    await sheet(page, "Эффект").getByRole("button", { name: effect }).click();
  }
}

/** Запись вызовов Element.animate (цель и длительность) — анимация длится 360 мс, опросом её не поймать. */
const recordAnimations = (page: Page) =>
  page.addInitScript(() => {
    const log: { tag: string; inMask: boolean; duration: number }[] = [];
    (window as unknown as { __anims: typeof log }).__anims = log;
    const orig = Element.prototype.animate;
    Element.prototype.animate = function (this: Element, kf: Keyframe[] | PropertyIndexedKeyframes | null, opts?: number | KeyframeAnimationOptions) {
      log.push({ tag: this.tagName.toLowerCase(), inMask: !!this.closest("mask"), duration: typeof opts === "number" ? opts : Number(opts?.duration) });
      return orig.call(this, kf, opts);
    };
  });
const animations = (page: Page) =>
  page.evaluate(() => (window as unknown as { __anims: { tag: string; inMask: boolean; duration: number }[] }).__anims);

test.describe("мазок кисти", () => {
  test("цвет ложится маской на 300–400 мс; когда мазок окончен, маски в разметке нет", async ({ page }) => {
    await recordAnimations(page);
    await page.goto("./");
    await paintNail(page);
    await expect.poll(async () => (await animations(page)).filter((a) => a.inMask).length).toBeGreaterThan(0);
    const strokes = (await animations(page)).filter((a) => a.inMask);
    for (const s of strokes) {
      expect(s.duration).toBeGreaterThanOrEqual(300);
      expect(s.duration).toBeLessThanOrEqual(400);
    }
    await expect(page.locator("#constructor mask")).toHaveCount(0);
    await expect(nail(page, 1)).toHaveAttribute("aria-label", /DN 29 · Клюква/);
  });

  test("новый тап во время мазка побеждает: остаётся последний цвет, масок не остаётся", async ({ page }) => {
    await page.goto("./");
    await nail(page, 1).click();
    const colors = sheet(page, "Цвет");
    await colors.getByRole("button", { name: "DN 29 · Клюква" }).click();
    await colors.getByRole("button", { name: "DN 01 · Молочный" }).click();
    await expect(nail(page, 1)).toHaveAttribute("aria-label", /DN 01 · Молочный/);
    await expect(page.locator("#constructor mask")).toHaveCount(0);
    await expect(page.locator("#constructor [data-nail-paint] > g[mask]")).toHaveCount(0);
  });

  test("вибрация 12 мс на телефоне, где она есть; без неё ошибок нет", async ({ page, isMobile }) => {
    test.skip(!isMobile, "вибрация — на телефоне");
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() => {
      const calls: number[] = [];
      (window as unknown as { __buzz: number[] }).__buzz = calls;
      Object.defineProperty(navigator, "vibrate", { configurable: true, value: (ms: number) => (calls.push(ms), true) });
    });
    await page.goto("./");
    await paintNail(page);
    await expect.poll(() => page.evaluate(() => (window as unknown as { __buzz: number[] }).__buzz)).toContain(12);

    // без navigator.vibrate (как iPhone) — тот же путь без ошибок
    await page.evaluate(() => Object.defineProperty(navigator, "vibrate", { configurable: true, value: undefined }));
    await nail(page, 2).click();
    await sheet(page, "Цвет").getByRole("button", { name: "DN 01 · Молочный" }).click();
    await expect(nail(page, 2)).toHaveAttribute("aria-label", /DN 01 · Молочный/);
    expect(errors).toEqual([]);
  });
});

test.describe("переливы", () => {
  // блик ногтя 1 — группа с clip-path вида «…-gl1-c»
  const glint = (page: Page) => page.locator('#constructor .dn-hand:not(.dn-hand--mirror) g[clip-path*="-gl1-c"]');
  const running = (page: Page) =>
    glint(page).evaluate((el) => el.getAnimations({ subtree: true }).filter((a) => /glint/.test((a as CSSAnimation).animationName ?? "")).length);

  test("хром и кошачий глаз переливаются: по ногтю идёт CSS-анимация", async ({ page }) => {
    await page.goto("./");
    await paintNail(page, "Хром");
    await expect(glint(page)).toHaveCount(1);
    await expect.poll(() => running(page)).toBeGreaterThan(0);
    await sheet(page, "Эффект").getByRole("button", { name: /Кошачий глаз/i }).click();
    await expect(glint(page)).toHaveCount(1);
    await expect.poll(() => running(page)).toBeGreaterThan(0);
  });

  test("глянец не переливается", async ({ page }) => {
    await page.goto("./");
    await paintNail(page, "Глянец");
    await expect(glint(page)).toHaveCount(0);
  });

  test("переливающийся ноготь по-прежнему тапается (его рамка не дрожит)", async ({ page }) => {
    await page.goto("./");
    await paintNail(page, "Хром");
    await nail(page, 1).click({ timeout: 5000 });
    await expect(nail(page, 1)).toHaveAttribute("aria-pressed", "true");
  });
});
test.describe("блик за наклоном", () => {
  const stubSensor = (page: Page, answer: "granted" | "denied") =>
    page.addInitScript((a) => {
      const w = window as unknown as { __asked: number };
      w.__asked = 0;
      const ctor = Object.assign(function () {}, {
        requestPermission: () => {
          w.__asked++;
          return Promise.resolve(a);
        },
      });
      Object.defineProperty(window, "DeviceOrientationEvent", { configurable: true, writable: true, value: ctor });
    }, answer);
  const asked = (page: Page) => page.evaluate(() => (window as unknown as { __asked: number }).__asked);

  test("кнопка по тапу спрашивает разрешение; «да» — блик идёт за наклоном", async ({ page, isMobile }) => {
    test.skip(!isMobile, "блик за наклоном — на телефоне");
    await stubSensor(page, "granted");
    await page.goto("./");
    await paintNail(page, "Хром");
    const btn = page.getByRole("button", { name: "Блик за наклоном" });
    await expect(btn).toBeVisible();
    const box = (await btn.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(await asked(page)).toBe(0); // само по себе разрешение не просится
    await btn.click();
    await expect(btn).toHaveAttribute("aria-pressed", "true");
    expect(await asked(page)).toBe(1);
    await page.evaluate(() => window.dispatchEvent(Object.assign(new Event("deviceorientation"), { gamma: 15, beta: 0 })));
    await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue("--dn-tilt"))).toBe("0.500");
    // выключить
    await btn.click();
    await expect(btn).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("html")).not.toHaveAttribute("data-tilt", "");
  });

  test("отказ — кнопка уходит и разрешение больше не спрашивается, даже после перезагрузки", async ({ page, isMobile }) => {
    test.skip(!isMobile, "блик за наклоном — на телефоне");
    await stubSensor(page, "denied");
    await page.goto("./");
    await paintNail(page, "Хром");
    await page.getByRole("button", { name: "Блик за наклоном" }).click();
    await expect(page.getByRole("button", { name: "Блик за наклоном" })).toHaveCount(0);
    expect(await asked(page)).toBe(1);
    await page.reload(); // хром остался в ссылке, датчик по-прежнему есть — но спрашивать больше нельзя
    await expect(nail(page, 1)).toHaveAttribute("aria-label", /Клюква, хром/);
    await page.waitForTimeout(300);
    await expect(page.getByRole("button", { name: "Блик за наклоном" })).toHaveCount(0);
    expect(await asked(page)).toBe(0); // счётчик новой страницы: вопроса не было
  });
});

test.describe("сушка в лампе", () => {
  const watchLamp = (page: Page) =>
    page.addInitScript(() => {
      const w = window as unknown as { __lamp: { seen: string[]; present: boolean } };
      w.__lamp = { seen: [], present: false };
      new MutationObserver(() => {
        const lamp = document.querySelector(".dn-lamp");
        if (lamp) w.__lamp.present = true;
        const t = lamp?.querySelector(".dn-lamp-count")?.textContent;
        if (t && w.__lamp.seen[w.__lamp.seen.length - 1] !== t) w.__lamp.seen.push(t);
      }).observe(document, { subtree: true, childList: true, characterData: true });
    });
  const lamp = (page: Page) => page.evaluate(() => (window as unknown as { __lamp: { seen: string[]; present: boolean } }).__lamp);

  test("«Сохранить»: лампа отсчитывает 3 → 2 → 1, потом карточка, лампа снята", async ({ page }) => {
    await watchLamp(page);
    await page.goto("./");
    await tools(page).getByRole("button", { name: "Сохранить", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Карточка-бриф", exact: true })).toBeVisible({ timeout: 20_000 });
    expect((await lamp(page)).seen).toEqual(["3", "2", "1"]);
    await expect(page.locator(".dn-lamp")).toHaveCount(0);
    await expect(page.locator(".dn-stage")).not.toHaveClass(/is-drying/);
  });

  test.describe("prefers-reduced-motion", () => {
    test("ни мазка, ни лампы, ни переливов — смена мгновенная, карточка появляется сразу", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await recordAnimations(page);
      await watchLamp(page);
      await page.goto("./");
      expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
      await paintNail(page, "Хром");
      await expect(nail(page, 1)).toHaveAttribute("aria-label", /Клюква, хром/);
      await page.waitForTimeout(300);
      expect((await animations(page)).filter((a) => a.inMask)).toEqual([]);
      const glint = page.locator("#constructor g[clip-path][aria-hidden='true']").first();
      await expect(glint).toBeHidden();
      await tools(page).getByRole("button", { name: "Сохранить", exact: true }).click();
      await expect(page.getByRole("dialog", { name: "Карточка-бриф", exact: true })).toBeVisible({ timeout: 20_000 });
      expect(await lamp(page)).toEqual({ seen: [], present: false });
    });
  });
});
