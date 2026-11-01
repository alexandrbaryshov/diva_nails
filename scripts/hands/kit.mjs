// Сборка «набора руки» для проверки в браузере (e2e/hand.spec.ts, scripts/hands/sheets.mjs):
// renderHandSvg, HandView и данные — одним ES-модулем в памяти, плюс страница, которая его грузит.
// Страница отдаётся через page.route на выдуманном адресе, файлы рук — из public/hands/.
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const KIT_ORIGIN = "http://hand-kit.test";
export const KIT_URL = `${KIT_ORIGIN}/diva-nails/`;

const ENTRY = `
import { h, render } from "preact";
import { renderHandSvg } from "/src/constructor/renderHand.ts";
import { HandView } from "/src/constructor/HandView.tsx";
import { HANDS } from "/src/constructor/hands.ts";
import { nailPath } from "/src/constructor/geometry.ts";
import { naturalDesign, SHAPES, LENGTHS, EFFECTS, PATTERNS } from "/src/state/design.ts";
window.__hand = {
  renderHandSvg, HANDS, nailPath, naturalDesign, SHAPES, LENGTHS, EFFECTS, PATTERNS,
  mount(el, props) { render(h(HandView, props), el); },
};
window.__handReady = true;
`;

let cached;
/** { js, css } набора; собирается один раз на процесс. */
export async function bundleHandKit() {
  if (cached) return cached;
  const { build } = await import("vite");
  const res = await build({
    root: ROOT,
    configFile: false,
    base: "/diva-nails/",
    logLevel: "error",
    publicDir: false,
    plugins: [
      {
        name: "hand-kit-entry",
        resolveId: (id) => (id === "virtual:hand-kit" ? "\0hand-kit" : null),
        load: (id) => (id === "\0hand-kit" ? ENTRY : null),
      },
    ],
    build: {
      write: false,
      minify: false,
      modulePreload: false,
      rollupOptions: { input: "virtual:hand-kit", output: { format: "es", inlineDynamicImports: true } },
    },
  });
  const out = (Array.isArray(res) ? res[0] : res).output;
  const js = out.filter((o) => o.type === "chunk").map((o) => o.code).join("\n");
  const css = out
    .filter((o) => o.type === "asset" && o.fileName.endsWith(".css"))
    .map((o) => String(o.source))
    .join("\n");
  cached = { js, css };
  return cached;
}

/** Подключить набор к странице Playwright: KIT_URL отдаёт страницу, /diva-nails/hands/* — файлы рук. */
export async function routeHandKit(page, { bodyCss = "" } = {}) {
  const { js, css } = await bundleHandKit();
  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>${css}
html,body{margin:0;background:#f6f0ea;font:14px/1.3 system-ui,sans-serif;color:#3b2a26}${bodyCss}</style></head>
<body><div id="root"></div><script type="module" src="/diva-nails/kit.js"></script></body></html>`;
  await page.route(`${KIT_ORIGIN}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/diva-nails/" || path === "/diva-nails/index.html") return route.fulfill({ contentType: "text/html", body: html });
    if (path === "/diva-nails/kit.js") return route.fulfill({ contentType: "text/javascript", body: js });
    const m = /^\/diva-nails\/hands\/([a-z]+-\d\.svg)$/.exec(path);
    if (m) return route.fulfill({ contentType: "image/svg+xml", body: readFileSync(join(ROOT, "public", "hands", m[1])) });
    return route.fulfill({ status: 404, body: "" });
  });
}
