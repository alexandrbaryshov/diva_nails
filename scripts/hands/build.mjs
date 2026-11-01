// Векторная рука → четыре тона кожи и плата для impeccable.
//
//   node scripts/hands/build.mjs
//
// Вход:  media-src/hands/<kind>-base.svg (пишет scripts/hands/trace.py), src/constructor/handArt.json
// Выход: public/hands/<kind>-<tone>.svg — рука в тоне 0..3 (тот же рисунок, заменены только цвета кожи)
//        media-src/hands/<kind>-plate.png — тон 1 в кадре области «hand» макета, 2000 px шириной,
//        прозрачный фон: это плата, которую этап plates сверяет с макетом (impeccable).
// После пересборки платы вшить промпт: impeccable embed-prompt media-src/hands/<kind>-plate.png --prompt-file media-src/hands/prompts/<kind>-plate.txt
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = join(ROOT, "media-src", "hands");
const OUT = join(ROOT, "public", "hands");
const ART = JSON.parse(readFileSync(join(ROOT, "src", "constructor", "handArt.json"), "utf8"));

// Цвета ролей по тонам (тон 1 — рука утверждённого макета) — общие с hands.ts.
const { tones: TONES } = JSON.parse(readFileSync(join(ROOT, "src", "constructor", "handTones.json"), "utf8"));

// Мягкая длинная тень влево-вниз, как в макете. Часть рисунка руки, а не страницы.
// Светотень трассировки (слои shade и light) — размыта внутри силуэта руки: в макете она мягкая, без
// «плакатных» ступенек; контур и складки остаются чёткими.
const SOFT = 5; // stdDeviation размытия светотени, единицы руки (≈ 3.5 px макета): края мягкие, пятна тени чёткие
const DEFS =
  '<defs><filter id="s" x="-25%" y="-10%" width="140%" height="125%" color-interpolation-filters="sRGB">' +
  '<feDropShadow dx="-70" dy="50" stdDeviation="46" flood-color="#7a645c" flood-opacity=".26"/></filter>' +
  `<filter id="soft" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${SOFT}"/></filter>` +
  '<clipPath id="sil"><use href="#sk"/></clipPath></defs>';

/** Средняя толщина пятна (2 × площадь / периметр) по точкам пути — тонкие штрихи (кусочки складок) не размываются. */
function thickness(d) {
  let area = 0;
  let per = 0;
  for (const sub of d.split(/(?=M)/)) {
    const n = (sub.match(/-?\d*\.?\d+/g) ?? []).map(Number);
    const pts = [];
    for (let i = 0; i + 1 < n.length; i += 2) pts.push([n[i], n[i + 1]]);
    if (pts.length < 3) continue;
    let a = 0;
    pts.forEach(([x1, y1], i) => {
      const [x2, y2] = pts[(i + 1) % pts.length];
      a += x1 * y2 - x2 * y1;
      per += Math.hypot(x2 - x1, y2 - y1);
    });
    area += a / 2;
  }
  return per ? (2 * Math.abs(area)) / per : 0;
}
/** Тоньше этого (единицы руки) пятно светотени — штрих складки: остаётся чётким. */
const THIN = 12;

/** Слои светотени — в одну группу с размытием, обрезанную силуэтом руки (путь кожи получает id="sk"). */
function softenShading(base) {
  const svg = base.replace('<path class="skin"', '<path id="sk" class="skin"');
  const start = svg.search(/<path class="(shade|light)"/);
  const end = svg.indexOf('<path class="crease"');
  if (start < 0 || end < start) throw new Error("hands: в базовом SVG нет слоёв светотени перед складками");
  const paths = svg.slice(start, end).match(/<path [^>]*\/>/g) ?? [];
  const soft = [];
  const crisp = [];
  for (const p of paths) (thickness(/ d="([^"]+)"/.exec(p)?.[1] ?? "") < THIN ? crisp : soft).push(p);
  return `${svg.slice(0, start)}<g filter="url(#soft)" clip-path="url(#sil)">${soft.join("")}</g>${crisp.join("")}${svg.slice(end)}`;
}

// Область «hand» макета (comp-1.png): бокс и где в нём стоит контур руки — из .impeccable/build/spec.json.
const COMP_REGION = { w: 1290, h: 1652 };
const COMP_HAND = { x0: 183, y0: 899 - 860, x1: 1229 };
const PLATE_WIDTH = 2000;

function toneSvg(base, tone) {
  const t = TONES[tone];
  let svg = softenShading(base).replace(/<path( id="\w+")? class="(\w+)" fill="#[0-9a-f]{6}"/g, (_, id, cls) => `<path${id ?? ""} fill="${t[cls] ?? t.skin}"`);
  svg = svg.replace('<g class="hand">', `${DEFS}<g filter="url(#s)">`);
  // размеры задаёт место вставки (<image width height>), сам файл — только viewBox
  return svg.replace(/ width="\d+" height="\d+"/, "");
}

mkdirSync(OUT, { recursive: true });
for (const kind of ["her", "his"]) {
  const base = readFileSync(join(SRC, `${kind}-base.svg`), "utf8");
  for (let tone = 0; tone < TONES.length; tone++) {
    const file = join(OUT, `${kind}-${tone}.svg`);
    const svg = toneSvg(base, tone);
    writeFileSync(file, svg);
    console.log(`hands: ${relative(ROOT, file)} — ${(svg.length / 1024).toFixed(0)} КБ`);
  }

  // Плата: тон 1 в кадре макета — контур руки занимает ту же долю ширины, что в области макета.
  const [bx0, by0, bx1] = ART[kind].bounds;
  const k = (bx1 - bx0) / (COMP_HAND.x1 - COMP_HAND.x0); // единиц SVG на пиксель макета
  const vx = bx0 - COMP_HAND.x0 * k;
  const vy = by0 - COMP_HAND.y0 * k;
  const vw = COMP_REGION.w * k;
  const vh = COMP_REGION.h * k;
  const height = Math.round((PLATE_WIDTH * COMP_REGION.h) / COMP_REGION.w);
  const framed = toneSvg(base, 1)
    .replace(/viewBox="[^"]+"/, `viewBox="${vx.toFixed(1)} ${vy.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}"`)
    .replace("<svg ", `<svg width="${PLATE_WIDTH}" height="${height}" `);
  const plate = join(SRC, `${kind}-plate.png`);
  await sharp(Buffer.from(framed)).png().toFile(plate);
  console.log(`hands: ${relative(ROOT, plate)} — ${PLATE_WIDTH}×${height}`);
}
