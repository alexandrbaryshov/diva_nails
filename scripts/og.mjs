// OG-картинки 1200×630 для превью в ВК и Telegram: `node scripts/og.mjs [--no-build] [--out=public/og]`.
//   main.png   — главная (og:image index.html);
//   design.png — ссылка на дизайн /d/ (og:image d/index.html).
// Не генерация, а снимок HTML-шаблона: Playwright (системный Chrome) рисует собранный сайт, снимает с него
// живую руку и кладёт в шаблон со шрифтами сайта. Кредиты не тратятся, текст чёткий.
// Результат лежит в public/og/ и коммитится; пересобирать при смене текста, шрифтов или руки.
import { mkdirSync, readFileSync } from "node:fs";
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
const OUT = resolve(ROOT, args.out || "public/og");
const W = 1200;
const H = 630;

// Для картинки ссылки на дизайн — «Клюквенный глянец» (код формата v1 из data/designs.json, как в e2e/smoke.spec.ts).
const DESIGN_HASH = "ASAOgAdAA6AB0ADoAA";

const CARDS = [
  {
    file: "main.png",
    path: "./",
    kicker: "Diva Nails · Чебоксары",
    title: "Нарисуй мечту — мы сделаем",
    lead: "Собери маникюр в конструкторе, сохрани карточку и покажи мастеру.",
    foot: "пр. Ленина, 7",
  },
  {
    file: "design.png",
    path: `./d/#d=${DESIGN_HASH}`,
    kicker: "Diva Nails · Чебоксары",
    title: "Посмотри мой дизайн маникюра",
    lead: "Открой ссылку и поправь под себя: цвет, форму, длину.",
    foot: "Конструктор маникюра",
  },
];

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

function template(card, handUrl, cssLinks) {
  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8">
${cssLinks}
<style>
  html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: var(--c-milk); }
  .og { position: relative; width: ${W}px; height: ${H}px; color: var(--c-ink); }
  .og-halo { position: absolute; right: -120px; top: -160px; width: 860px; height: 860px; border-radius: 50%;
    background: radial-gradient(circle at 50% 50%, var(--c-powder) 0%, rgba(231, 207, 196, 0) 68%); opacity: 0.8; }
  .og-text { position: absolute; left: 72px; top: 0; bottom: 0; width: 600px; display: flex; flex-direction: column; justify-content: center; }
  .og-kicker { margin: 0 0 28px; font-family: var(--font-wordmark); font-size: 30px; letter-spacing: 0.02em; color: var(--c-cocoa); }
  .og-title { margin: 0; font-family: var(--font-display); font-weight: 400; font-size: 76px; line-height: 1.06; text-wrap: balance; }
  .og-lead { margin: 30px 0 0; max-width: 520px; font-family: var(--font-text); font-size: 28px; line-height: 1.4; color: var(--c-cocoa); }
  .og-foot { margin: 44px 0 0; align-self: flex-start; padding: 12px 26px; border-radius: 999px; background: var(--c-caramel-deep);
    color: var(--c-on-caramel-deep); font-family: var(--font-text); font-weight: 500; font-size: 24px; }
  .og-handbox { position: absolute; left: 660px; right: 0; top: 64px; bottom: -80px; display: flex; justify-content: center; align-items: flex-start; }
  .og-hand { height: 100%; width: auto; filter: drop-shadow(0 24px 30px rgba(59, 42, 38, 0.18)); }
</style></head>
<body><div class="og">
  <div class="og-halo"></div>
  <div class="og-text">
    <p class="og-kicker">${esc(card.kicker)}</p>
    <h1 class="og-title">${esc(card.title)}</h1>
    <p class="og-lead">${esc(card.lead)}</p>
    <p class="og-foot">${esc(card.foot)}</p>
  </div>
  <div class="og-handbox"><img class="og-hand" alt="" src="${handUrl}"></div>
</div></body></html>`;
}

let server;
let base = args.url;
if (!base) {
  const vite = await import("vite");
  if (args["no-build"] !== "true") await vite.build({ root: ROOT, logLevel: "warn" });
  server = await vite.preview({ root: ROOT, logLevel: "warn", preview: { port: 4200, strictPort: false, host: "127.0.0.1" } });
  base = server.resolvedUrls?.local?.[0];
  if (!base) throw new Error("og: vite preview не дал адрес");
}

// стили собранного сайта: токены, шрифты, база — те же, что у страницы
const distHtml = readFileSync(join(ROOT, "dist", "index.html"), "utf8");
const cssLinks = [...distHtml.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)].map((m) => m[0]).join("\n");
if (!cssLinks) throw new Error("og: в dist/index.html нет стилей — собери сайт без --no-build");

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
try {
  for (const card of CARDS) {
    // 1. рука с дизайном — как её рисует конструктор, на прозрачном фоне
    const handCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: "reduce", locale: "ru-RU" });
    const handPage = await handCtx.newPage();
    await handPage.goto(new URL(card.path, base).toString(), { waitUntil: "networkidle" });
    await handPage.addStyleTag({
      content:
        "html,body{background:transparent!important} body *{visibility:hidden!important;background:transparent!important} .dn-hand,.dn-hand *{visibility:visible!important} .dn-taphint,.dn-badge{display:none!important}",
    });
    await handPage.evaluate(() => document.fonts.ready);
    const hand = handPage.locator(".dn-hand").first();
    await hand.waitFor();
    // обрезаем прозрачные поля вокруг руки: в шаблон идёт только рисунок
    const handPng = await sharp(await hand.screenshot({ omitBackground: true })).trim({ threshold: 1 }).png().toBuffer();
    await handCtx.close();

    // 2. шаблон 1200×630 со шрифтами сайта
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, locale: "ru-RU" });
    const page = await ctx.newPage();
    const tplUrl = new URL("__og__.html", base).toString();
    await page.route(tplUrl, (route) =>
      route.fulfill({ contentType: "text/html; charset=utf-8", body: template(card, `data:image/png;base64,${handPng.toString("base64")}`, cssLinks) }),
    );
    await page.goto(tplUrl, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const file = join(OUT, card.file);
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: W, height: H } });
    await ctx.close();
    console.log(`og: ${relative(ROOT, file)} — ${W}×${H}`);
  }
} finally {
  await browser.close();
  if (server) await new Promise((r) => server.httpServer.close(r));
}
