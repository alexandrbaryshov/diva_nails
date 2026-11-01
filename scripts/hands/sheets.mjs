// Листы-образцы руки для ревью (через renderHandSvg → <img>, то есть тем же путём, что карточка):
//   .impeccable/review/hand-shapes.png — 6 форм на экстра- и короткой длине, мужская рука, контуры поверх лож
//   .impeccable/review/hand-tones.png  — 4 тона обеих рук и две руки (зеркало)
//   .impeccable/review/finishes.png    — 7 эффектов × 8 узоров (с «без узора») крупно, экран 3×
//
//   node scripts/hands/sheets.mjs
import { mkdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { KIT_URL, routeHandKit } from "./kit.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = join(ROOT, ".impeccable", "review");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });

async function sheet(name, dpr, width, build) {
  const page = await browser.newPage({ viewport: { width, height: 400 }, deviceScaleFactor: dpr });
  await routeHandKit(page, {
    bodyCss: `.grid{display:grid;gap:10px;padding:16px}.cell{background:#fbf8f4;border-radius:12px;padding:8px;text-align:center}
.cell img{display:block;width:100%;height:auto}.cell p{margin:4px 0 0}h2{font-size:15px;margin:14px 16px 0}`,
  });
  await page.goto(KIT_URL);
  await page.waitForFunction(() => window.__handReady === true);
  await page.evaluate(build);
  await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
  const file = join(OUT, name);
  await page.screenshot({ path: file, fullPage: true });
  await page.close();
  console.log(`sheets: ${relative(ROOT, file)}`);
}

await sheet("hand-shapes.png", 2, 1240, async () => {
  const k = window.__hand;
  const RU = { square: "квадрат", "soft-square": "мягкий квадрат", oval: "овал", almond: "миндаль", ballerina: "балерина", stiletto: "стилет" };
  const root = document.getElementById("root");
  const shades = ["DN29", "DN01", "DN26", "DN18", "DN39"];
  const paint = (hand, shape, length, i0 = 0) => {
    const d = k.naturalDesign(hand);
    d.shape = shape;
    d.length = length;
    d.nails = d.nails.map((n, i) => ({ ...n, shade: hand === "his" ? null : shades[(i + i0) % shades.length] }));
    return d;
  };
  const row = async (title, items) => {
    const h = document.createElement("h2");
    h.textContent = title;
    root.append(h);
    const grid = document.createElement("div");
    grid.className = "grid";
    grid.style.gridTemplateColumns = `repeat(${items.length}, 1fr)`;
    for (const [label, d] of items) {
      const svg = await k.renderHandSvg(d, [], { width: 600, height: 840, twoHands: false });
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.innerHTML = `<img alt="" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}"><p>${label}</p>`;
      grid.append(cell);
    }
    root.append(grid);
  };
  await row("Её рука — экстра-длина, 6 форм", k.SHAPES.map((s) => [RU[s], paint("her", s, "extra")]));
  await row("Её рука — короткая длина, 6 форм", k.SHAPES.map((s) => [RU[s], paint("her", s, "short", 2)]));
  const LEN = { short: "короткая", medium: "средняя", long: "длинная", extra: "экстра" };
  await row("Её рука — миндаль: короткая → экстра", k.LENGTHS.map((l) => [LEN[l], paint("her", "almond", l, 1)]));
  await row("Его рука — короткие формы, натуральные ногти", [
    ...["square", "soft-square", "oval"].map((s) => [RU[s], paint("his", s, "short")]),
    ["чёрный мат", { ...paint("his", "soft-square", "short"), nails: paint("his", "soft-square", "short").nails.map((n) => ({ ...n, shade: "DNM4", effect: "matte" })) }],
  ]);
});

await sheet("hand-tones.png", 2, 1240, async () => {
  const k = window.__hand;
  const root = document.getElementById("root");
  const grid = document.createElement("div");
  grid.className = "grid";
  grid.style.gridTemplateColumns = "repeat(4, 1fr)";
  root.append(grid);
  const add = async (label, d, two = false) => {
    const svg = await k.renderHandSvg(d, [], { width: two ? 1200 : 600, height: 840, twoHands: two });
    const cell = document.createElement("div");
    cell.className = "cell";
    if (two) cell.style.gridColumn = "span 2";
    cell.innerHTML = `<img alt="" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}"><p>${label}</p>`;
    grid.append(cell);
  };
  for (const hand of ["her", "his"]) {
    for (const tone of [0, 1, 2, 3]) {
      const d = k.naturalDesign(hand);
      d.tone = tone;
      if (hand === "her") d.nails = d.nails.map((n, i) => ({ ...n, shade: i === 3 ? "DN29" : "DN01", effect: i === 3 ? "chrome" : "gloss" }));
      await add(`${hand === "her" ? "её" : "его"} · тон ${tone}`, d);
    }
  }
  const d = k.naturalDesign("her");
  d.twoHands = true;
  d.shape = "almond";
  d.length = "medium";
  d.nails = d.nails.map((n, i) => ({ ...n, shade: i === 3 ? "DN29" : "DN01", pattern: i === 1 ? "french" : "none" }));
  await add("две руки: вторая — зеркало, тот же дизайн", d, true);
  const dh = k.naturalDesign("his");
  dh.twoHands = true;
  await add("его: две руки", dh, true);
});

await sheet("finishes.png", 3, 1240, async () => {
  const k = window.__hand;
  const EFF = { gloss: "глянец", matte: "матовое", chrome: "хром", rub: "втирка", "cat-eye": "кошачий глаз", glitter: "блёстки", gradient: "градиент" };
  const PAT = { none: "без узора", french: "френч", lunar: "лунный", ombre: "омбре", marble: "мрамор", dots: "точки", stripes: "полоски", hearts: "сердечки" };
  const root = document.getElementById("root");
  const grid = document.createElement("div");
  grid.className = "grid";
  grid.style.gridTemplateColumns = `110px repeat(${k.PATTERNS.length}, 1fr)`;
  root.append(grid);
  const head = (t) => {
    const c = document.createElement("div");
    c.style.cssText = "align-self:center;font-weight:600;text-align:center";
    c.textContent = t;
    grid.append(c);
  };
  head("");
  for (const p of k.PATTERNS) head(PAT[p]);
  const a = k.HANDS.her.anchors[2];
  const base = { gloss: "DN14", matte: "DN14", chrome: "DN29", rub: "DN24", "cat-eye": "DN26", glitter: "DN33", gradient: "DN18" };
  for (const e of k.EFFECTS) {
    head(EFF[e]);
    for (const p of k.PATTERNS) {
      const d = k.naturalDesign("her");
      d.shape = "almond";
      d.length = "long";
      const decor = p === "none" && e === "gloss" ? [{ item: "rhinestone-crystal", u: 0.5, v: 0.22, scale: 1, rot: 0 }, { item: "sticker-star", u: 0.5, v: 0.55, scale: 1.25, rot: 0 }] : [];
      d.nails = d.nails.map((n) => ({ ...n, shade: base[e], effect: e, pattern: p, decor }));
      let svg = await k.renderHandSvg(d, [], { width: 240, height: 300, twoHands: false });
      // крупно — только средний ноготь
      const r = (a.angle * Math.PI) / 180;
      const L = a.bed + a.width * 1.4;
      const cx = a.x + Math.sin(r) * L * 0.5;
      const cy = a.y - Math.cos(r) * L * 0.5;
      const side = L * 1.15;
      svg = svg.replace(/viewBox="[^"]+"/, `viewBox="${cx - side * 0.4} ${cy - side * 0.5} ${side * 0.8} ${side}"`);
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.innerHTML = `<img alt="" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}">`;
      grid.append(cell);
    }
  }
});

await browser.close();
