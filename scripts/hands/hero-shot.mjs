// Захват первого экрана для гейта impeccable «hero» — в пикселях утверждённого макета (1536×2752).
//
//   node scripts/hands/hero-shot.mjs [--out=.impeccable/review/hero-repro.png] [--no-build]
//
// Телефон шириной 390 CSS px при DPR 1536/390: высота окна 699 (макет — 698.75 CSS px), снимок обрезается
// до 2752 px. Раскладка та же, что при 698.75: высота конструктора считается от ширины (100vw × 1.7917).
// Печатает, где на снимке рука (рамка SVG), — для сверки ногтей с макетом.
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : "true"];
  }),
);
const OUT = resolve(ROOT, args.out || ".impeccable/review/hero-repro.png");
const COMP = { w: 1536, h: 2752 };
const DPR = COMP.w / 390;

const vite = await import("vite");
if (args["no-build"] !== "true") await vite.build({ root: ROOT, logLevel: "warn" });
const server = await vite.preview({ root: ROOT, logLevel: "warn", preview: { port: 4190, strictPort: false, host: "127.0.0.1" } });
const base = server.resolvedUrls?.local?.[0];
const browser = await chromium.launch({ channel: "chrome" });
try {
  if (!base) throw new Error("hero-shot: vite preview не дал адрес");
  const context = await browser.newContext({
    viewport: { width: 390, height: 699 },
    deviceScaleFactor: DPR,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
    locale: "ru-RU",
  });
  const page = await context.newPage();
  await page.goto(new URL("./", base).toString(), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.images].every((i) => i.complete));
  const box = await page.evaluate(() => {
    const r = document.querySelector(".dn-hand svg")?.getBoundingClientRect();
    return r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null;
  });
  if (args.nails === "true") {
    // рамки контуров ногтей на снимке — сверка с замером ногтей макета
    const nails = await page.evaluate(() =>
      [...document.querySelectorAll(".dn-hand svg g[data-nail] > path:last-of-type")].map((p) => {
        const r = p.getBoundingClientRect();
        return [r.left, r.top, r.right, r.bottom];
      }),
    );
    for (const [i, n] of nails.entries()) console.log(`hero-shot: ноготь ${i}: ${n.map((v) => (v * DPR).toFixed(1)).join(" ")}`);
  }
  const png = await page.screenshot({ type: "png" });
  await sharp(png).extract({ left: 0, top: 0, width: COMP.w, height: COMP.h }).png().toFile(OUT);
  await context.close();
  if (box) {
    const k = DPR;
    console.log(`hero-shot: рука на снимке x=${(box.x * k).toFixed(1)} y=${(box.y * k).toFixed(1)} w=${(box.w * k).toFixed(1)} h=${(box.h * k).toFixed(1)} px`);
  }
  console.log(`hero-shot: ${relative(ROOT, OUT)} — ${COMP.w}×${COMP.h}`);
} finally {
  await browser.close();
  await new Promise((r) => server.httpServer.close(r));
}
