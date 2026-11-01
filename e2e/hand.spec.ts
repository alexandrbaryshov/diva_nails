import { expect, test } from "@playwright/test";
import { KIT_URL, routeHandKit } from "../scripts/hands/kit.mjs";

// Рука и ногти в настоящих движках: WebKit (iPhone) и Chrome (Android, компьютер).
// Набор руки (renderHandSvg, HandView) собирается Vite в память и отдаётся через page.route,
// файлы рук — из public/hands/.

test.describe("рука и ногти", () => {
  test.beforeEach(async ({ page }) => {
    await routeHandKit(page);
    await page.goto(KIT_URL);
    await page.waitForFunction(() => (window as unknown as { __handReady?: boolean }).__handReady === true);
  });

  test("HandView: рука грузится картинкой, пять ногтей — кнопки, тап выбирает ноготь", async ({ page }) => {
    const handFile = page.waitForResponse((r) => r.url().endsWith("/diva_nails/hands/her-1.svg") && r.ok());
    await page.evaluate(() => {
      const k = (window as unknown as { __hand: Kit }).__hand;
      const el = document.getElementById("root")!;
      el.style.width = "360px";
      const d = k.naturalDesign("her");
      d.nails[3].shade = "DN29";
      const taps: number[] = [];
      (window as unknown as { __taps: number[] }).__taps = taps;
      k.mount(el, { design: d, interactive: true, selected: 3, onNailTap: (i: number) => taps.push(i) });
    });
    await handFile;
    const nails = page.getByRole("button");
    await expect(nails).toHaveCount(5);
    await expect(nails.nth(3)).toHaveAttribute("aria-pressed", "true");
    await nails.nth(1).click();
    expect(await page.evaluate(() => (window as unknown as { __taps: number[] }).__taps)).toEqual([1]);
    const box = await page.locator("svg image").boundingBox();
    expect(box?.width).toBeGreaterThan(300);
    // клавиатура: ноготь получает фокус, стрелка — к соседнему, Enter — выбор
    await nails.nth(2).focus();
    await expect(nails.nth(2)).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(nails.nth(3)).toBeFocused();
    await page.keyboard.press("Enter");
    expect(await page.evaluate(() => (window as unknown as { __taps: number[] }).__taps)).toEqual([1, 3]);
  });

  test("renderHandSvg: самодостаточная строка рисуется в canvas, ногти и кожа на своих местах", async ({ page }) => {
    const res = await page.evaluate(async () => {
      const k = (window as unknown as { __hand: Kit }).__hand;
      const art = k.HANDS.her;
      const [, , vw, vh] = art.viewBox;
      const d = k.naturalDesign("her");
      d.tone = 2;
      d.shape = "oval";
      d.length = "medium";
      d.nails = d.nails.map((n) => ({ ...n, shade: "DN29", effect: "gloss" as const }));
      const W = vw / 2;
      const H = vh / 2;
      const svg = await k.renderHandSvg(d, [], { width: W, height: H, twoHands: false });
      const externals = [...svg.matchAll(/href="([^"]*)"/g)].map((m) => m[1]).filter((h) => !h.startsWith("data:"));
      const img = new Image();
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, W, H);
      const px = (x: number, y: number) => Array.from(ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data);
      // середина ложа каждого ногтя (ось, полпути к подушечке), в пикселях canvas (масштаб 0.5)
      const nails = art.anchors.map((a) => {
        const r = (a.angle * Math.PI) / 180;
        return px((a.x + Math.sin(r) * a.bed * 0.5) / 2, (a.y - Math.cos(r) * a.bed * 0.5) / 2);
      });
      const [x0, y0, x1, y1] = art.bounds;
      const palm = px(((x0 + x1) / 2 + 140) / 2, (y0 + (y1 - y0) * 0.72) / 2);
      const corner = px(4, 4);
      const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/png"));
      return { externals, nails, palm, corner, png: blob?.size ?? 0 };
    });
    expect(res.externals).toEqual([]);
    const near = (got: number[], hex: string, tol: number) => {
      const n = parseInt(hex.slice(1), 16);
      const want = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      return want.every((v, i) => Math.abs(v - got[i]) <= tol) && got[3] > 240;
    };
    for (const [i, p] of res.nails.entries()) expect(near(p, "#9c1f32", 14), `ноготь ${i}: ${p}`).toBe(true);
    // ладонь — в цветах тона 2 (кожа, блик, тень или складка)
    expect(["#c99178", "#d8a78f", "#a8705c", "#985f4c"].some((c) => near(res.palm, c, 16)), `ладонь: ${res.palm}`).toBe(true);
    expect(res.corner[3], "фон прозрачный").toBe(0);
    expect(res.png).toBeGreaterThan(10_000);
  });
});

// Таблетки «Записаться» и «Сохранить» — тёмная карамель с белой подписью (ревью первого экрана, Н3):
// фон около #9E6542, контраст подписи по WCAG не ниже 4.5:1.
test("таблетки «Записаться» и «Сохранить»: тёмная карамель, белая подпись, контраст ≥ 4.5:1", async ({ page }) => {
  await page.goto("./");
  for (const sel of [".book-pill", ".dn-save-pill"]) {
    const pill = page.locator(sel).first();
    await expect(pill, sel).toBeVisible();
    const { bg, fg } = await pill.evaluate((el) => {
      const s = getComputedStyle(el);
      return { bg: s.backgroundColor, fg: s.color };
    });
    const rgbOf = (c: string) => (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    const lum = (c: number[]) => {
      const [r, g, b] = c.map((v) => {
        const x = v / 255;
        return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const [b, f] = [rgbOf(bg), rgbOf(fg)];
    const [hi, lo] = [lum(b), lum(f)].sort((x, y) => y - x);
    const contrast = (hi + 0.05) / (lo + 0.05);
    expect(contrast, `${sel}: ${fg} на ${bg}`).toBeGreaterThanOrEqual(4.5);
    expect(f, `${sel}: подпись белая`).toEqual([255, 255, 255]);
    // около #9E6542 = rgb(158, 101, 66)
    [158, 101, 66].forEach((v, i) => expect(Math.abs(b[i] - v), `${sel}: фон ${bg}`).toBeLessThanOrEqual(12));
  }
});

interface Kit {
  HANDS: Record<"her" | "his", { viewBox: number[]; bounds: number[]; anchors: { x: number; y: number; angle: number; width: number; bed: number }[] }>;
  naturalDesign(h: "her" | "his"): {
    tone: number;
    shape: string;
    length: string;
    nails: { shade: string | null; effect: string }[];
  };
  renderHandSvg(d: unknown, prints: unknown[], o: { width: number; height: number; twoHands: boolean }): Promise<string>;
  mount(el: HTMLElement, props: Record<string, unknown>): void;
}
