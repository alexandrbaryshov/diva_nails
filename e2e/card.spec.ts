import { expect, test, type Page } from "@playwright/test";
import { encode } from "uqr";

// layout.ts без импортов: Node читает его напрямую (динамически — tsc не требует расширения .ts)
interface Box { x: number; y: number }
const layout = (await import(new URL("../src/card/layout.ts", import.meta.url).href)) as {
  CARD_W: number;
  CARD_H: number;
  HAND_BOX: Box & { w: number; h: number };
  QR_BOX: Box & { size: number };
  REF_BOX: Box & { size: number };
  qrGeometry(n: number): { module: number; x0: number; y0: number };
};
const { CARD_H, CARD_W, HAND_BOX, QR_BOX, REF_BOX, qrGeometry } = layout;

// Карточка-бриф на настоящих движках: iPhone (WebKit), Android (Chrome), компьютер.

const tools = (page: Page) => page.getByRole("toolbar", { name: "Инструменты" });
const dialog = (page: Page) => page.getByRole("dialog", { name: "Карточка-бриф", exact: true });

async function openCard(page: Page) {
  await tools(page).getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(dialog(page)).toBeVisible({ timeout: 20_000 });
}

/** PNG карточки из превью: размер из заголовка файла, цвета — в запрошенных точках (через canvas). */
async function readCard(page: Page, points: [number, number][] = []) {
  return page.evaluate(async (pts) => {
    const img = document.querySelector<HTMLImageElement>(".sv-card")!;
    const buf = new Uint8Array(await (await fetch(img.src)).arrayBuffer());
    const dv = new DataView(buf.buffer);
    const signature = Array.from(buf.slice(0, 8)).join(",");
    const bmp = await createImageBitmap(new Blob([buf], { type: "image/png" }));
    const c = document.createElement("canvas");
    c.width = bmp.width;
    c.height = bmp.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(bmp, 0, 0);
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    const colors = pts.map(([x, y]) => {
      const i = (y * c.width + x) * 4;
      return [data[i], data[i + 1], data[i + 2]];
    });
    return { signature, w: dv.getUint32(16), h: dv.getUint32(20), colors };
  }, points);
}

const isInk = ([r, g, b]: number[]) => Math.abs(r - 0xfb) + Math.abs(g - 0xf8) + Math.abs(b - 0xf4) > 24;
const grid = (x0: number, x1: number, step: number): [number, number][] => {
  const out: [number, number][] = [];
  for (let y = HAND_BOX.y; y < HAND_BOX.y + HAND_BOX.h; y += step) for (let x = x0; x < x1; x += step) out.push([x, y]);
  return out;
};
// системное «Поделиться» у Chrome на Windows открывает окно ОС — в тестах скачивания его убираем
const withoutShare = (page: Page) =>
  page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true });
  });

test.describe("карточка-бриф", () => {
  test("PNG 1080×1920, QR совпадает с матрицей ссылки на этот дизайн", async ({ page }) => {
    await page.goto("./");
    await page.locator('#constructor .dn-hand:not(.dn-hand--mirror) [data-nail="1"]').click();
    await page.getByRole("region", { name: "Цвет", exact: true }).getByRole("button", { name: "DN 29 · Клюква" }).click();
    await openCard(page);
    const hash = await page.evaluate(() => location.hash);
    const url = `https://alexandrbaryshov.github.io/diva-nails/d/${hash}`;
    expect(url.length).toBeLessThanOrEqual(120);
    const matrix = encode(url, { ecc: "M", border: 0 }).data;
    const g = qrGeometry(matrix.length);
    const centers: [number, number][] = [];
    matrix.forEach((row, y) => row.forEach((_, x) => centers.push([g.x0 + x * g.module + (g.module >> 1), g.y0 + y * g.module + (g.module >> 1)])));
    const handPts = grid(HAND_BOX.x, HAND_BOX.x + HAND_BOX.w, 8);
    const card = await readCard(page, [...centers, ...handPts]);
    expect(card.signature).toBe("137,80,78,71,13,10,26,10");
    expect([card.w, card.h]).toEqual([CARD_W, CARD_H]);

    // рука нарисована в своей рамке
    expect(card.colors.slice(centers.length).filter(isInk).length).toBeGreaterThan(300);

    // QR: центры модулей читаются как матрица encode(ссылка на дизайн)
    let wrong = 0;
    matrix.forEach((row, y) => row.forEach((dark, x) => {
      if ((card.colors[y * row.length + x][0] < 128) !== dark) wrong++;
    }));    expect(wrong).toBe(0);
    expect(g.x0).toBeGreaterThan(QR_BOX.x);
  });

  test("вторая рука видна на карточке; без неё правый край пуст", async ({ page }) => {
    await page.goto("./");
    const edge = grid(860, 1000, 4);
    const rightInk = async () => (await readCard(page, edge)).colors.filter(isInk).length;
    await openCard(page);
    expect(await rightInk()).toBe(0);
    await dialog(page).getByRole("button", { name: "Закрыть" }).click();
    await expect(dialog(page)).toHaveCount(0);

    await tools(page).getByRole("button", { name: "Форма", exact: true }).click();
    await page.getByRole("button", { name: "Повторить на второй руке" }).click();
    await openCard(page);
    expect(await rightInk()).toBeGreaterThan(100);
  });

  test("референс попадает на карточку", async ({ page }) => {
    await page.goto("./");
    await page.waitForLoadState("networkidle");
    await tools(page).getByRole("button", { name: "Картинка", exact: true }).click();
    const png = await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = c.height = 200;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#d02030";
      ctx.fillRect(0, 0, 200, 200);
      return c.toDataURL("image/png").split(",")[1];
    });
    await page.locator('input[data-picture="reference"]').setInputFiles({ name: "pin.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
    await expect(page.locator(".dn-stage figure")).toContainText("хочу похоже");
    await openCard(page);
    const card = await readCard(page, [[REF_BOX.x + REF_BOX.size / 2, REF_BOX.y + REF_BOX.size / 2]]);
    const [r, g, b] = card.colors[0];
    expect(r).toBeGreaterThan(180);
    expect(g).toBeLessThan(90);
    expect(b).toBeLessThan(110);
  });

  test("четыре действия; «В галерею» отдаёт PNG; «Записаться онлайн» — уточняется; дизайн цел", async ({ page }) => {
    await withoutShare(page);
    await page.goto("./");
    const hash = await page.evaluate(() => location.hash);
    await openCard(page);
    const d = dialog(page);
    await expect(d.locator(".sv-actions > *")).toHaveText([/^В галерею$/, /^В Telegram$/, /^Записаться онлайн/, /^Скопировать ссылку$/]);

    // скачивание (iPhone-WebKit в тесте без share с файлами — тот же путь)
    const download = page.waitForEvent("download", { timeout: 15_000 }).catch(() => null);
    await d.getByRole("button", { name: "В галерею" }).click();
    const file = await download;
    if (file) expect(file.suggestedFilename()).toMatch(/^diva-nails-\d{4}-\d{2}-\d{2}\.png$/);
    else await expect(page.getByText("Зажми и сохрани")).toBeVisible();

    await d.getByRole("button", { name: /Записаться онлайн/ }).click();
    await expect(d.getByRole("status")).toHaveText("Онлайн-запись скоро появится — напиши нам в Telegram");
    await d.getByRole("button", { name: "Закрыть" }).click();
    await expect(d).toHaveCount(0);
    expect(await page.evaluate(() => location.hash)).toBe(hash);
  });

  test("нет скачивания и share — полноэкранная картинка «Зажми и сохрани»", async ({ page }) => {
    await withoutShare(page);
    await page.addInitScript(() => {
      delete (HTMLAnchorElement.prototype as unknown as Record<string, unknown>).download;
    });
    await page.goto("./");
    await openCard(page);
    await dialog(page).getByRole("button", { name: "В галерею" }).click();
    await expect(page.getByText("Зажми и сохрани")).toBeVisible();
    await page.getByRole("dialog", { name: "Карточка на весь экран" }).getByRole("button", { name: "Готово" }).click();
    await expect(dialog(page)).toBeVisible();
  });

  test("«Поделиться» с файлом; отмена оставляет карточку открытой", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __shared: unknown[] }).__shared = [];
      Object.defineProperty(navigator, "canShare", { value: () => true, configurable: true });
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: (data: ShareData) => {
          const w = window as unknown as { __shared: unknown[]; __cancel?: boolean };
          if (w.__cancel) return Promise.reject(new DOMException("cancel", "AbortError"));
          w.__shared.push({ name: data.files?.[0].name, type: data.files?.[0].type, size: data.files?.[0].size });
          return Promise.resolve();
        },
      });
    });
    await page.goto("./");
    await openCard(page);
    await page.evaluate(() => ((window as unknown as { __cancel: boolean }).__cancel = true));
    await dialog(page).getByRole("button", { name: "В галерею" }).click();
    await expect(dialog(page)).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __shared: unknown[] }).__shared.length)).toBe(0);

    await page.evaluate(() => ((window as unknown as { __cancel: boolean }).__cancel = false));
    await dialog(page).getByRole("button", { name: "В галерею" }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __shared: unknown[] }).__shared.length)).toBe(1);
    const shared = (await page.evaluate(() => (window as unknown as { __shared: { type: string; size: number }[] }).__shared))[0];
    expect(shared.type).toBe("image/png");
    expect(shared.size).toBeGreaterThan(10_000);
  });
});



