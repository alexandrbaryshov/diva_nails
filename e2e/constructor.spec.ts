import { expect, test, type Locator, type Page } from "@playwright/test";

// Конструктор на настоящих движках: iPhone (WebKit), Android (Chrome), компьютер 1440 (Chrome).

const nail = (page: Page, i: number) => page.locator(`#constructor .dn-hand:not(.dn-hand--mirror) [data-nail="${i}"]`);
const tools = (page: Page) => page.getByRole("toolbar", { name: "Инструменты" });
const sheet = (page: Page, name: string) => page.getByRole("region", { name, exact: true });

async function openTool(page: Page, name: string) {
  const btn = tools(page).getByRole("button", { name, exact: true });
  if ((await btn.getAttribute("aria-pressed")) !== "true") await btn.click();
  await expect(sheet(page, name)).toBeVisible();
}

async function center(l: Locator) {
  const b = await l.boundingBox();
  if (!b) throw new Error("нет рамки");
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

test.describe("первый экран", () => {
  test("ноготь тапается до прокрутки, панель инструментов видна (390×664 и 360×640)", async ({ page, isMobile }) => {
    test.skip(!isMobile, "телефонный первый экран");
    for (const size of [
      { width: 390, height: 664 },
      { width: 360, height: 640 },
    ]) {
      await page.setViewportSize(size);
      await page.goto("./");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Нарисуй мечту — мы сделаем");
      await expect(page.getByText("нажми на ноготь для выбора")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Дизайн месяца" })).toBeVisible();
      for (let i = 0; i < 5; i++) {
        const b = (await nail(page, i).boundingBox())!;
        expect(b.y + b.height, `ноготь ${i} на ${size.width}×${size.height}`).toBeLessThan(size.height);
      }
      const bar = (await tools(page).boundingBox())!;
      expect(bar.y + bar.height).toBeLessThanOrEqual(size.height + 0.5);
      for (const name of ["Цвет", "Эффект", "Дизайн", "Форма", "Картинка", "Сохранить"]) {
        const b = (await tools(page).getByRole("button", { name, exact: true }).boundingBox())!;
        expect(b.x, name).toBeGreaterThanOrEqual(0);
        expect(b.x + b.width, name).toBeLessThanOrEqual(size.width);
      }
      await nail(page, 3).tap();
      await expect(nail(page, 3)).toHaveAttribute("aria-pressed", "true");
      await expect(sheet(page, "Цвет")).toBeVisible();
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
    }
  });

  test("компьютер: рука слева, инструменты колонкой справа, меню-якоря в шапке", async ({ page, isMobile }) => {
    test.skip(isMobile, "раскладка компьютера");
    await page.goto("./");
    const hand = (await page.locator("#constructor .dn-hand").first().boundingBox())!;
    const bar = (await tools(page).boundingBox())!;
    expect(hand.x + hand.width / 2).toBeLessThan(bar.x);
    expect(bar.y).toBeLessThan(hand.y + hand.height);
    const nav = page.getByRole("navigation", { name: "Разделы" });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link")).toHaveText(["Работы", "Цены", "Для него", "Визит", "Отзывы", "Контакты"]);
    await expect(sheet(page, "Цвет")).toBeVisible();
  });
});

test.describe("главный путь", () => {
  test("цвет, «На все ногти», эффект, узор, форма и длина; всё в адресе и после перезагрузки", async ({ page }) => {
    await page.goto("./");
    const thumb0 = (await nail(page, 0).getAttribute("aria-label"))!;
    await nail(page, 1).click();
    await expect(sheet(page, "Цвет")).toBeVisible();
    // подписи оттенков видны текстом
    await expect(sheet(page, "Цвет").getByText("DN 01 · Молочный", { exact: true })).toBeVisible();
    await expect(sheet(page, "Цвет").getByText("Палитра студии уточняется — подписи временные")).toBeVisible();
    await sheet(page, "Цвет").getByRole("button", { name: "DN 29 · Клюква" }).click();
    await expect(nail(page, 1)).toHaveAttribute("aria-label", /^Указательный: DN 29 · Клюква/);
    await expect(nail(page, 0)).toHaveAttribute("aria-label", thumb0);
    await sheet(page, "Цвет").getByRole("button", { name: "На все ногти" }).click();
    for (let i = 0; i < 5; i++) await expect(nail(page, i)).toHaveAttribute("aria-label", /DN 29 · Клюква/);

    await openTool(page, "Эффект");
    await sheet(page, "Эффект").getByRole("button", { name: "Хром" }).click();
    await expect(nail(page, 1)).toHaveAttribute("aria-label", /Клюква, хром/);

    await openTool(page, "Дизайн");
    await sheet(page, "Дизайн").getByRole("button", { name: "Френч" }).click();
    await expect(nail(page, 1)).toHaveAttribute("aria-label", /френч/);

    await openTool(page, "Форма");
    const before = await nail(page, 2).locator("clipPath path").getAttribute("d");
    await sheet(page, "Форма").getByRole("button", { name: "Стилет" }).click();
    await expect(page.getByText("Это наращивание — сделаем").first()).toBeHidden();
    await sheet(page, "Форма").getByRole("button", { name: "Экстра" }).click();
    await expect(page.getByText("Это наращивание — сделаем").first()).toBeVisible();
    expect(await nail(page, 2).locator("clipPath path").getAttribute("d")).not.toBe(before);

    const hash = await page.evaluate(() => location.hash);
    expect(hash).toMatch(/^#d=[A-Za-z0-9_-]+$/);
    const labels = await page.locator("#constructor .dn-hand [data-nail]").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
    await page.reload();
    await expect(nail(page, 4)).toHaveAttribute("aria-label", labels[4]!);
    expect(await page.evaluate(() => location.hash)).toBe(hash);

    // ссылка открывает ту же руку
    await page.goto(`./d/${hash}`);
    await expect(nail(page, 1)).toHaveAttribute("aria-label", labels[1]!);
  });

  test("↶ ↷ «Сбросить»; с клавиатуры: стрелки по ногтям, Enter — «Цвет», Ctrl+Z", async ({ page, isMobile }) => {
    await page.goto("./");
    const month0 = (await nail(page, 0).getAttribute("aria-label"))!;
    await nail(page, 0).click();
    await sheet(page, "Цвет").getByRole("button", { name: "DN 39 · Чёрный" }).click();
    await expect(nail(page, 0)).toHaveAttribute("aria-label", /Чёрный/);
    await page.getByRole("button", { name: "Отменить" }).click();
    await expect(nail(page, 0)).toHaveAttribute("aria-label", month0);
    await page.getByRole("button", { name: "Вернуть" }).click();
    await expect(nail(page, 0)).toHaveAttribute("aria-label", /Чёрный/);
    await page.getByRole("button", { name: "Сбросить" }).click();
    for (let i = 0; i < 5; i++) await expect(nail(page, i)).toHaveAttribute("aria-label", /без покрытия/);
    test.skip(isMobile, "клавиатура — на компьютере");
    await page.keyboard.press("Control+z");
    await expect(nail(page, 0)).toHaveAttribute("aria-label", /Чёрный/);
    await page.keyboard.press("Control+Shift+z");
    await expect(nail(page, 0)).toHaveAttribute("aria-label", /без покрытия/);
    await nail(page, 1).focus();
    await page.keyboard.press("ArrowRight");
    await expect(nail(page, 2)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(nail(page, 2)).toHaveAttribute("aria-pressed", "true");
    await expect(sheet(page, "Цвет")).toBeVisible();
  });

  test("декор тянется пальцем и мышью в пределах ногтя", async ({ page, isMobile }) => {
    await page.goto("./");
    await nail(page, 2).click();
    await openTool(page, "Дизайн");
    await sheet(page, "Дизайн").getByRole("button", { name: "Жемчужина" }).click();
    const gem = nail(page, 2).locator("[data-decor='0']");
    await expect(gem).toHaveCount(1);
    const t0 = await gem.getAttribute("transform");
    const nb = (await nail(page, 2).boundingBox())!;
    const from = await center(gem);
    const to = { x: nb.x + nb.width * 0.5, y: nb.y + nb.height * 0.82 };
    if (isMobile) {
      // палец: события касания (pointerType touch) прямо по ногтю
      await gem.evaluate(
        (el, p) => {
          const fire = (type: string, x: number, y: number) =>
            el.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: "touch", isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true }));
          fire("pointerdown", p.from.x, p.from.y);
          fire("pointermove", (p.from.x + p.to.x) / 2, (p.from.y + p.to.y) / 2);
          fire("pointermove", p.to.x, p.to.y);
          fire("pointerup", p.to.x, p.to.y);
        },
        { from, to },
      );
    } else {
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 });
      await page.mouse.move(to.x, to.y, { steps: 4 });
      await page.mouse.up();
    }
    await expect.poll(() => gem.getAttribute("transform")).not.toBe(t0);
    // декор остался в пределах ногтя
    const g = await center(gem);
    expect(g.x).toBeGreaterThanOrEqual(nb.x - 1);
    expect(g.x).toBeLessThanOrEqual(nb.x + nb.width + 1);
    expect(g.y).toBeGreaterThanOrEqual(nb.y - 1);
    expect(g.y).toBeLessThanOrEqual(nb.y + nb.height + 1);
    // удаляется
    await sheet(page, "Дизайн").getByRole("button", { name: "Убрать: Жемчужина" }).click();
    await expect(gem).toHaveCount(0);
  });
});

test.describe("картинка", () => {
  test("на ноготь — по форме ногтя, большое фото уменьшается, в сеть не уходит; не картинка — понятный ответ", async ({ page }) => {
    await page.goto("./");
    await page.waitForLoadState("networkidle");
    await nail(page, 3).click();
    await openTool(page, "Картинка");
    await expect(sheet(page, "Картинка").getByText(/картинка никуда не уходит/i)).toBeVisible();
    const png = await page.evaluate(async () => {
      const c = document.createElement("canvas");
      c.width = 2400;
      c.height = 1600;
      const ctx = c.getContext("2d")!;
      const g = ctx.createLinearGradient(0, 0, 2400, 1600);
      g.addColorStop(0, "#c8323f");
      g.addColorStop(1, "#f2cf73");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 2400, 1600);
      return c.toDataURL("image/png").split(",")[1];
    });
    const requests: string[] = [];
    page.on("request", (r) => {
      if (!/^(blob|data):/.test(r.url())) requests.push(`${r.method()} ${r.url()}`);
    });
    await page.locator('input[data-picture="nail"]').setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
    const printImg = nail(page, 3).locator("[clip-path] image");
    await expect(printImg).toHaveCount(1);
    const href = (await printImg.getAttribute("href"))!;
    expect(href).toMatch(/^blob:/);
    const size = await page.evaluate(async (u) => {
      const bmp = await createImageBitmap(await (await fetch(u)).blob());
      return [bmp.width, bmp.height];
    }, href);
    expect(Math.max(...size)).toBeLessThanOrEqual(1600);
    // двигается и масштабируется кнопками
    await page.getByRole("button", { name: "Картинка больше" }).click();
    await page.getByRole("button", { name: "Повернуть картинку" }).click();
    await expect(printImg.locator("xpath=..")).toHaveAttribute("transform", /rotate\(15\)/);

    await page.locator('input[data-picture="reference"]').setInputFiles({ name: "pin.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
    await expect(page.locator(".dn-stage figure")).toContainText("хочу похоже");

    await page.locator('input[data-picture="nail"]').setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
    await expect(page.getByRole("alert")).toHaveText("Это не картинка — выбери фото или скрин");
    expect(requests.filter((r) => !r.startsWith("GET ") || !r.includes("127.0.0.1"))).toEqual([]);
  });
});

test.describe("лента, «Подбери мне», «Удиви меня»", () => {
  test("лента листается, первый — дизайн месяца, любой применяется", async ({ page, isMobile }) => {
    await page.goto("./");
    const strip = page.getByRole("region", { name: "Дизайн месяца" });
    const cards = strip.locator(".dn-card--preset");
    const n = await cards.count();
    expect(n).toBeGreaterThanOrEqual(12);
    expect(n).toBeLessThanOrEqual(15);
    await expect(cards.first()).toHaveAttribute("aria-label", /^Дизайн месяца: /);
    const row = strip.locator(".dn-strip-row");
    if (isMobile) {
      await row.evaluate((el) => el.scrollBy({ left: 400 }));
      expect(await row.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
    } else {
      await strip.getByRole("button", { name: "Листать вперёд" }).click();
      await expect.poll(() => row.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
      await cards.nth(1).focus();
      await page.keyboard.press("ArrowRight");
      await expect(cards.nth(2)).toBeFocused();
    }
    const card = cards.nth(9);
    await card.scrollIntoViewIfNeeded();
    const hash0 = await page.evaluate(() => location.hash);
    await card.click();
    await expect.poll(() => page.evaluate(() => location.hash)).not.toBe(hash0);
  });

  test("«Подбери мне»: три шага — три дизайна; «Удиви меня» — два подряд разные", async ({ page }) => {
    await page.goto("./");
    await page.getByRole("button", { name: "Подбери мне" }).click();
    const quiz = sheet(page, "Подбери мне");
    await quiz.getByRole("button", { name: "Свидание" }).click();
    await quiz.getByRole("button", { name: "Нежно" }).click();
    await quiz.getByRole("button", { name: "Средние" }).click();
    const results = quiz.locator(".dn-quiz-result");
    await expect(results).toHaveCount(3);
    const titles = await results.allTextContents();
    expect(new Set(titles).size).toBe(3);
    await results.nth(2).click();
    await expect(quiz).toHaveCount(0);
    const h1 = await page.evaluate(() => location.hash);
    await page.getByRole("button", { name: "Удиви меня" }).click();
    await expect.poll(() => page.evaluate(() => location.hash)).not.toBe(h1);
    const h2 = await page.evaluate(() => location.hash);
    await page.getByRole("button", { name: "Удиви меня" }).click();
    await expect.poll(() => page.evaluate(() => location.hash)).not.toBe(h2);
  });
});

test.describe("её и его, вторая рука", () => {
  test("«Его»: мужская рука и мужской набор; тон кожи; вторая рука появляется и убирается", async ({ page }) => {
    await page.goto("./");
    await page.getByRole("button", { name: "Его", exact: true }).click();
    await expect(page.locator("#constructor .dn-hand image").first()).toHaveAttribute("href", /hands\/his-\d\.svg$/);
    await openTool(page, "Цвет");
    await expect(sheet(page, "Цвет").locator(".dn-swatch")).toHaveCount(4);
    await openTool(page, "Форма");
    await expect(sheet(page, "Форма").getByRole("button", { name: "Стилет" })).toHaveCount(0);
    expect(await page.locator("#constructor").textContent()).not.toMatch(/ноготоч|♥|❤/);

    const tone = page.getByRole("slider", { name: "Тон кожи" });
    const dot = tone.locator("[data-tone='3']");
    await dot.click();
    await expect(tone).toHaveAttribute("aria-valuenow", "3");
    await expect(page.locator("#constructor .dn-hand image").first()).toHaveAttribute("href", /his-3\.svg$/);

    const twin = sheet(page, "Форма").getByRole("button", { name: "Повторить на второй руке" });
    await twin.click();
    await expect(page.locator("#constructor .dn-hand")).toHaveCount(2);
    await expect(page.locator("#constructor [data-mirrored]")).toHaveCount(1);
    await twin.click();
    await expect(page.locator("#constructor .dn-hand")).toHaveCount(1);
  });
});

test.describe("запись", () => {
  test("«Записаться» раскрывает выбор: Telegram с текстом из дизайна, онлайн — «уточняется»", async ({ page, context }) => {
    await context.route("https://t.me/**", (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<title>t.me</title>" }));
    await page.goto("./");
    await page.locator(".site-header").getByRole("button", { name: "Записаться" }).click();
    const dlg = page.getByRole("dialog", { name: "Записаться" });
    await expect(dlg).toBeVisible();
    const tg = dlg.getByRole("link", { name: /Написать в Telegram/ });
    const href = (await tg.getAttribute("href"))!;
    expect(href.startsWith("https://t.me/divanail21?text=")).toBe(true);
    expect(decodeURIComponent(href.split("?text=")[1])).toMatch(/^Привет! Хочу записаться: .+ Мой дизайн: https:\/\/alexandrbaryshov\.github\.io\/diva-nails\/d\/#d=/);
    const popup = page.waitForEvent("popup");
    await tg.click();
    const tab = await popup;
    await tab.waitForLoadState();
    expect(tab.url()).toContain("t.me/divanail21");
    await expect(dlg.getByText("Текст скопирован — вставь в чат, если не подставился")).toBeVisible();
    await dlg.getByRole("button", { name: /Выбрать время онлайн · уточняется/ }).click();
    await expect(dlg.getByText("Онлайн-запись скоро появится — напиши нам в Telegram")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dlg).toHaveCount(0);
  });

  test("режим автора: ?author=1 — «Экспорт дизайна в JSON»", async ({ page }) => {
    await page.goto("./");
    await expect(page.getByRole("button", { name: "Экспорт дизайна в JSON" })).toHaveCount(0);
    await page.goto("./?author=1");
    await expect(page.getByRole("button", { name: "Экспорт дизайна в JSON" })).toBeVisible();
  });
});

test.describe("размеры", () => {
  test("кнопки, ссылки и ногти — не меньше 44 × 44 px", async ({ page }) => {
    await page.goto("./");
    const small = async () =>
      page.evaluate(() => {
        const out: string[] = [];
        const scope = document.querySelectorAll("#constructor, .site-header, #booking-sheet");
        for (const root of scope)
          for (const el of root.querySelectorAll<HTMLElement>("button, a[href], [role=slider], [role=button]:not([data-nail])")) {
            const r = el.getBoundingClientRect();
            const st = getComputedStyle(el);
            if (r.width === 0 || r.height === 0 || st.visibility === "hidden") continue;
            if (r.bottom < 0 || r.top > innerHeight) continue;
            if (r.width < 43.5 || r.height < 43.5) out.push(`${el.tagName} «${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 30)}» ${r.width.toFixed(1)}×${r.height.toFixed(1)}`);
          }
        // ноготь: зона касания — контур с широкой невидимой обводкой
        for (const hit of document.querySelectorAll<SVGPathElement>("#constructor [data-nail] > path[fill='transparent']")) {
          const box = hit.getBBox();
          const sw = parseFloat(getComputedStyle(hit).strokeWidth);
          const m = hit.getScreenCTM()!;
          const k = Math.hypot(m.a, m.b);
          const w = (box.width + sw) * k;
          const h = (box.height + sw) * k;
          if (w < 44 || h < 44) out.push(`ноготь ${hit.parentElement?.getAttribute("data-nail")} ${w.toFixed(1)}×${h.toFixed(1)}`);
        }
        return out;
      });
    expect(await small()).toEqual([]);
    await nail(page, 2).click();
    for (const name of ["Цвет", "Эффект", "Дизайн", "Форма", "Картинка"]) {
      await openTool(page, name);
      await page.waitForTimeout(400); // рука сжимается под лист — дождаться конца перехода
      expect(await small(), name).toEqual([]);
    }
    await page.locator(".site-header").getByRole("button", { name: "Записаться" }).click();
    expect(await small(), "запись").toEqual([]);
  });
});
