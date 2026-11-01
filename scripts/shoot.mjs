// npm run shoot — скриншоты собранного сайта для ревью:
//   desktop.png     — 1440, вся страница
//   mobile.png      — 390, вся страница
//   hero-repro.png  — 390×844, только первый экран
//   hero-mockup.png — первый экран в пикселях утверждённого макета, 1536×2752 (только с --mockup)
//
//   node scripts/shoot.mjs [--out=.impeccable/review] [--url=http://…/diva-nails/] [--no-build]
//                          [--hero=390x844] [--dpr=2] [--path=./]
//                          [--only=desktop,mobile,hero,mockup]   что снимать (по умолчанию desktop, mobile, hero)
//                          [--mockup]                            добавить hero-mockup.png (см. scripts/hands/hero-shot.mjs)
//
// Без --url собирает dist/ и поднимает vite preview на свободном порту.
// Браузер — системный Chrome (Playwright 1.52, channel: "chrome"); движение выключено (reduced motion).
import { mkdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : "true"];
  }),
);
const OUT = resolve(ROOT, args.out || ".impeccable/review");
const [heroW, heroH] = (args.hero || "390x844").split("x").map(Number);
const DPR = Number(args.dpr || 2);
const PATH = args.path || "./";
const ONLY = new Set((args.only || (args.mockup === "true" ? "desktop,mobile,hero,mockup" : "desktop,mobile,hero")).split(","));
// макет первого экрана: телефон 390 CSS px при DPR 1536/390, окно 699 (макет — 698.75), снимок обрезается до 2752 px
const COMP = { w: 1536, h: 2752 };

let server;
let base = args.url;
if (!base) {
  const vite = await import("vite");
  if (args["no-build"] !== "true") await vite.build({ root: ROOT, logLevel: "warn" });
  server = await vite.preview({ root: ROOT, logLevel: "warn", preview: { port: 4180, strictPort: false, host: "127.0.0.1" } });
  base = server.resolvedUrls?.local?.[0];
  if (!base) throw new Error("shoot: vite preview не дал адрес");
}
const url = new URL(PATH, base).toString();

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });

/** Ленивые картинки грузятся по прокрутке: пройти страницу сверху вниз и дождаться всех, потом вернуться наверх. */
async function loadLazyImages(page) {
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(window.innerHeight * 0.8));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, document.documentElement.scrollHeight);
    await new Promise((r) => setTimeout(r, 120));
  });
  await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 15000 }).catch(() => undefined);
  // decode() у ещё не загруженной картинки может не завершиться — ждём не дольше 5 с
  await page.evaluate(() =>
    Promise.race([Promise.all([...document.images].map((i) => i.decode().catch(() => undefined))), new Promise((r) => setTimeout(r, 5000))]),
  );
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function shot(name, viewport, fullPage, deviceScaleFactor, isMobile, crop) {
  const context = await browser.newContext({ viewport, deviceScaleFactor, isMobile, hasTouch: isMobile, reducedMotion: "reduce", locale: "ru-RU" });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  if (fullPage) await loadLazyImages(page);
  const file = join(OUT, name);
  if (crop) {
    const png = await page.screenshot({ type: "png" });
    await sharp(png).extract({ left: 0, top: 0, width: crop.w, height: crop.h }).png().toFile(file);
  } else {
    await page.screenshot({ path: file, fullPage });
  }
  await context.close();
  console.log(`shoot: ${relative(ROOT, file)}`);
}

try {
  if (ONLY.has("desktop")) await shot("desktop.png", { width: 1440, height: 900 }, true, 1, false);
  if (ONLY.has("mobile")) await shot("mobile.png", { width: 390, height: 844 }, true, DPR, true);
  if (ONLY.has("hero")) await shot("hero-repro.png", { width: heroW, height: heroH }, false, DPR, true);
  if (ONLY.has("mockup")) await shot("hero-mockup.png", { width: 390, height: 699 }, false, COMP.w / 390, true, COMP);
} finally {
  await browser.close();
  if (server) await new Promise((r) => server.httpServer.close(r));
}
