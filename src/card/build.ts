// Карточка-бриф: SVG-композиция (рука, тексты, QR) → <img> → <canvas> 1080×1920 → PNG.
// Всё самодостаточно: рука, референс и шрифты — data URI, поэтому работает и в WebKit, и в Chrome.
import { STUDIO } from "../data/studio";
import { renderHandSvg } from "../constructor/renderHand";
import type { Design, Print, Reference } from "../state/design";
import { cardDate, cardLines, cardShapeLine } from "./lines";
import {
  CARD_H,
  CARD_W,
  HAND_BOX,
  LINES,
  MARGIN,
  PROMO_BOX,
  QR_BOX,
  REF_BOX,
  SHAPE_Y,
  qrGeometry,
} from "./layout";
import { qrMatrix } from "./qr";

export interface CardInput {
  design: Design;
  prints: Print[];
  reference: Reference | null;
  createdAt: Date;
  url: string;
}

const INK = "#3b2a26";
const COCOA = "#7a645c";
const MILK = "#f6f0ea";
const CREAM = "#fbf8f4";
const POWDER = "#e7cfc4";
const CARAMEL = "#c9a48e";

const FONT_FILES: { family: string; weight: number; files: string[] }[] = [
  { family: "Forum", weight: 400, files: ["forum-cyrillic-400", "forum-latin-400"] },
  { family: "Overpass", weight: 400, files: ["overpass-cyrillic-400", "overpass-latin-400"] },
  { family: "Overpass", weight: 500, files: ["overpass-cyrillic-500", "overpass-latin-500"] },
  { family: "Noto Serif HK", weight: 400, files: ["noto-serif-hk-cyrillic-400", "noto-serif-hk-latin-400"] },
];
const CYRILLIC = "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116";
const LATIN =
  "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error("не прочитать файл"));
    r.readAsDataURL(blob);
  });
}

async function fetchDataUri(url: string): Promise<string> {
  if (url.startsWith("data:")) return url;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} — ${res.status}`);
  return blobToDataUri(await res.blob());
}

let fontCss: Promise<string> | null = null;

/** @font-face со своими woff2 внутри SVG карточки. */
function loadFontCss(): Promise<string> {
  fontCss ??= (async () => {
    const base = import.meta.env.BASE_URL;
    const rules: string[] = [];
    for (const f of FONT_FILES) {
      const [cyr, lat] = await Promise.all(f.files.map((n) => fetchDataUri(`${base}fonts/${n}.woff2`)));
      rules.push(
        `@font-face{font-family:"${f.family}";font-weight:${f.weight};src:url(${cyr}) format("woff2");unicode-range:${CYRILLIC}}`,
        `@font-face{font-family:"${f.family}";font-weight:${f.weight};src:url(${lat}) format("woff2");unicode-range:${LATIN}}`,
      );
    }
    return rules.join("");
  })();
  fontCss.catch(() => {
    fontCss = null; // не вышло с первого раза — попробуем снова при следующем сохранении
  });
  return fontCss;
}

function qrSvg(url: string): string {
  const m = qrMatrix(url);
  const { module, x0, y0 } = qrGeometry(m.length);
  let d = "";
  m.forEach((row, y) =>
    row.forEach((on, x) => {
      if (on) d += `M${x0 + x * module} ${y0 + y * module}h${module}v${module}h${-module}z`;
    }),
  );
  return (
    `<rect x="${QR_BOX.x}" y="${QR_BOX.y}" width="${QR_BOX.size}" height="${QR_BOX.size}" rx="16" fill="#ffffff"/>` +
    `<path d="${d}" fill="${INK}" shape-rendering="crispEdges"/>`
  );
}

/** Строка влезает в ширину: уменьшаем кегль по грубой оценке ширины знака. */
function fit(text: string, size: number, maxW: number): number {
  return Math.max(20, Math.min(size, Math.floor(maxW / (text.length * 0.5))));
}

export function cardSvg(parts: { input: CardInput; fonts: string; hand: string; referenceHref: string | null }): string {
  const { input, fonts, hand, referenceHref } = parts;
  const { design } = input;
  const lines = cardLines(design);
  const t = (x: number, y: number, size: number, text: string, extra = "") =>
    `<text x="${x}" y="${y}" font-size="${size}" xml:space="preserve" ${extra}>${esc(text)}</text>`;

  let body = `<rect width="${CARD_W}" height="${CARD_H}" fill="${MILK}"/>`;
  // шапка
  body += t(MARGIN, 124, 76, "Diva Nails", `font-family="'Noto Serif HK', Georgia, serif" fill="${INK}"`);
  body += t(MARGIN, 176, 30, `${STUDIO.city}, ${STUDIO.address}`, `font-family="Overpass, sans-serif" fill="${COCOA}"`);
  // рука на сливочной подложке
  body += `<rect x="${HAND_BOX.x}" y="${HAND_BOX.y}" width="${HAND_BOX.w}" height="${HAND_BOX.h}" rx="40" fill="${CREAM}"/>`;
  body += hand;
  // что на ногтях
  body += t(MARGIN, LINES.titleY, 46, "Что на ногтях", `font-family="Forum, Georgia, serif" fill="${INK}"`);
  lines.forEach((l, i) => {
    const y = LINES.firstY + i * LINES.step;
    body += `<line x1="${MARGIN}" x2="${CARD_W - MARGIN}" y1="${y - 40}" y2="${y - 40}" stroke="${POWDER}" stroke-width="2"/>`;
    body += t(MARGIN, y, 30, l.nail, `font-family="Overpass, sans-serif" font-weight="500" fill="${COCOA}"`);
    body += t(LINES.textX, y, fit(l.text, 31, LINES.maxW), l.text, `font-family="Overpass, sans-serif" fill="${INK}"`);
  });
  body += t(MARGIN, SHAPE_Y, 34, `Форма и длина: ${cardShapeLine(design).toLowerCase()}`, `font-family="Overpass, sans-serif" font-weight="500" fill="${INK}"`);

  // нижний ряд: референс, место под промокод, QR
  let promoX = MARGIN;
  if (referenceHref) {
    const r = REF_BOX;
    body += `<defs><clipPath id="refclip"><rect x="${r.x}" y="${r.y}" width="${r.size}" height="${r.size}" rx="24"/></clipPath></defs>`;
    body += `<rect x="${r.x}" y="${r.y}" width="${r.size}" height="${r.size}" rx="24" fill="${CREAM}"/>`;
    body += `<image href="${referenceHref}" x="${r.x}" y="${r.y}" width="${r.size}" height="${r.size}" preserveAspectRatio="xMidYMid slice" clip-path="url(#refclip)"/>`;
    body += t(r.x, r.y + r.size + 44, 30, "хочу похоже", `font-family="Overpass, sans-serif" fill="${COCOA}"`);
    promoX = r.x + r.size + 32;
  }
  const promoW = QR_BOX.x - 32 - promoX;
  body += `<rect x="${promoX}" y="${PROMO_BOX.y}" width="${promoW}" height="${PROMO_BOX.h}" rx="24" fill="none" stroke="${CARAMEL}" stroke-width="3" stroke-dasharray="14 12"/>`;
  body += t(promoX + 28, PROMO_BOX.y + 54, 28, "Промокод", `font-family="Overpass, sans-serif" fill="${COCOA}"`);
  body += qrSvg(input.url);
  body += t(QR_BOX.x, QR_BOX.y + QR_BOX.size + 38, 24, "Наведи камеру —", `font-family="Overpass, sans-serif" fill="${COCOA}"`);
  body += t(QR_BOX.x, QR_BOX.y + QR_BOX.size + 68, 24, "откроется эта рука", `font-family="Overpass, sans-serif" fill="${COCOA}"`);
  body += t(MARGIN, CARD_H - 72, 30, cardDate(input.createdAt), `font-family="Overpass, sans-serif" fill="${COCOA}"`);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">` +
    `<style>${fonts}</style>${body}</svg>`
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("карточка не нарисовалась"));
    img.src = src;
  });
}

/** PNG 1080×1920. Бросает ошибку, если что-то не собралось (дизайн при этом не трогается). */
export async function buildCard(input: CardInput): Promise<Blob> {
  const { design, prints, reference } = input;
  const [fonts, handRaw, referenceHref] = await Promise.all([
    loadFontCss(),
    renderHandSvg(design, prints, { width: HAND_BOX.w, height: HAND_BOX.h, twoHands: design.twoHands }),
    reference ? fetchDataUri(reference.url) : Promise.resolve(null),
  ]);
  const hand = handRaw.replace(/^<svg /, `<svg x="${HAND_BOX.x}" y="${HAND_BOX.y}" `);
  const svg = cardSvg({ input, fonts, hand, referenceHref });
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  // WebKit дорисовывает шрифты из SVG чуть позже первой загрузки — рисуем со второй
  await loadImage(src);
  const img = await loadImage(src);
  try {
    await img.decode();
  } catch {
    // decode необязателен: картинка уже загружена
  }

  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("нет холста");
  ctx.drawImage(img, 0, 0, CARD_W, CARD_H);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG не собрался"))), "image/png");
  });
}




