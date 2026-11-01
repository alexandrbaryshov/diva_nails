// Бюджет и форма сборки dist/ — последний шаг `npm run check`.
// Проверяет: страницы на месте, главная пререндерена, JS первого экрана ≤ 90 КБ gzip (Т2, R144).
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const BASE = "/diva-nails/";
const LIMITS = {
  firstScreenJsGzip: 90 * 1024,
};

const errors = [];
const lines = [];
const kb = (n) => `${(n / 1024).toFixed(1)} КБ`;
const gz = (buf) => gzipSync(buf, { level: 9 }).length;

function read(rel) {
  const p = join(DIST, rel);
  if (!existsSync(p)) {
    errors.push(`нет dist/${rel}`);
    return null;
  }
  return readFileSync(p);
}

/** URL из HTML → путь внутри dist/ (или null для внешних и data:). */
function toDist(url) {
  if (/^(data:|https?:|\/\/)/.test(url)) return null;
  if (url.startsWith(BASE)) return url.slice(BASE.length);
  if (url.startsWith("/")) return url.slice(1);
  return url;
}

/** Статические импорты чанка (динамические import() не считаются — они не на первом экране). */
function staticImports(code, fromRel) {
  const out = new Set();
  const re = /(?:^|[;}\s])(?:import|export)\s*(?:[\w$*{}\s,]*?\s*from\s*)?["'](\.{1,2}\/[^"']+\.js)["']/g;
  let m;
  while ((m = re.exec(code))) out.add(posix.normalize(posix.join(posix.dirname(fromRel), m[1])));
  return out;
}

function firstScreen(htmlRel) {
  const html = read(htmlRel);
  if (!html) return { js: 0, css: 0 };
  const text = html.toString("utf8");
  const js = new Set();
  const css = new Set();
  for (const m of text.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)) {
    const p = toDist(m[1]);
    if (p) js.add(p);
  }
  for (const m of text.matchAll(/<link\b[^>]*rel="modulepreload"[^>]*href="([^"]+)"/g)) {
    const p = toDist(m[1]);
    if (p) js.add(p);
  }
  for (const m of text.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)) {
    const p = toDist(m[1]);
    if (p) css.add(p);
  }
  // замыкание по статическим импортам
  const queue = [...js];
  while (queue.length) {
    const rel = queue.shift();
    const buf = read(rel);
    if (!buf) continue;
    for (const dep of staticImports(buf.toString("utf8"), rel)) {
      if (!js.has(dep)) {
        js.add(dep);
        queue.push(dep);
      }
    }
  }
  let jsGz = 0;
  for (const rel of js) {
    const buf = read(rel);
    if (buf) jsGz += gz(buf);
  }
  let cssGz = 0;
  for (const rel of css) {
    const buf = read(rel);
    if (buf) cssGz += gz(buf);
  }
  return { js: jsGz, css: cssGz, files: js.size };
}

// 1. Страницы
const index = read("index.html")?.toString("utf8") ?? "";
read("d/index.html");
read("privacy/index.html");
if (index) {
  if (!/<html[^>]*\blang="ru"/.test(index)) errors.push('dist/index.html: нет lang="ru"');
  const app = /<div id="app">([\s\S]*?)<\/div>\s*<\/body>/.exec(index);
  if (!app || !/id="constructor"/.test(app[1])) errors.push("dist/index.html: нет пререндеренной разметки с #constructor");
}

// 2. Бюджет первого экрана
const home = firstScreen("index.html");
lines.push(`главная: JS первого экрана ${kb(home.js)} gzip (${home.files} файл.), лимит ${kb(LIMITS.firstScreenJsGzip)}; CSS ${kb(home.css)} gzip`);
if (home.js > LIMITS.firstScreenJsGzip) errors.push(`JS первого экрана ${kb(home.js)} gzip > ${kb(LIMITS.firstScreenJsGzip)}`);
const shared = firstScreen("d/index.html");
lines.push(`d/: JS ${kb(shared.js)} gzip; CSS ${kb(shared.css)} gzip`);

for (const l of lines) console.log(`budget: ${l}`);
if (errors.length) {
  for (const e of errors) console.error(`budget: ✗ ${e}`);
  process.exit(1);
}
console.log("budget: ok");
