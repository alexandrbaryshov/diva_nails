// Та же рука, что в HandView, — строкой SVG для карточки: самодостаточной (все href — data URI),
// чтобы её можно было нарисовать в <canvas> через <img> и в WebKit, и в Chrome.
import { h, render } from "preact";
import type { Design, Print } from "../state/design";
import { HANDS } from "./hands";
import { HandGraphic } from "./HandView";

const SVG_NS = "http://www.w3.org/2000/svg";
/** Зазор между руками в двух руках, доля ширины viewBox руки. */
const PAIR_GAP = 0.04;

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error("renderHandSvg: не прочитать картинку"));
    r.readAsDataURL(blob);
  });
}

async function toDataUri(url: string, type?: string): Promise<string> {
  if (url.startsWith("data:")) return url;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`renderHandSvg: ${url} — ${res.status}`);
  if (type === "image/svg+xml") {
    // рука — ASCII-текст SVG: так короче и надёжнее, чем base64 из Blob
    const text = await res.text();
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
  }
  return blobToDataUri(await res.blob());
}

/**
 * Рука строкой SVG размера width × height (рисунок вписан по центру). twoHands — рука и её зеркальная пара рядом.
 * Внешние href (файл руки, картинки принтов) заменены на data URI.
 */
export async function renderHandSvg(
  design: Design,
  prints: Print[],
  opts: { width: number; height: number; twoHands: boolean },
): Promise<string> {
  const art = HANDS[design.hand];
  const [vx, vy, vw, vh] = art.viewBox;
  const handHref = await toDataUri(art.tones[design.tone], "image/svg+xml");
  const printHrefs: Record<number, string> = {};
  for (const p of prints) printHrefs[p.nail] = await toDataUri(p.url);

  const gap = vw * PAIR_GAP;
  const totalW = opts.twoHands ? vw * 2 + gap : vw;
  const hands = opts.twoHands
    ? [
        h("g", { key: "a" }, h(HandGraphic, { design, prints, uid: "ca", handHref, printHrefs })),
        h(
          "g",
          { key: "b", transform: `translate(${vw + gap} 0)` },
          h(HandGraphic, { design, prints, uid: "cb", handHref, printHrefs, mirrored: true }),
        ),
      ]
    : [h(HandGraphic, { key: "a", design, prints, uid: "ca", handHref, printHrefs })];

  const host = document.createElement("div");
  render(
    h(
      "svg",
      {
        // xmlns пишет сам XMLSerializer: элемент создан в пространстве имён SVG
        width: opts.width,
        height: opts.height,
        viewBox: `${vx} ${vy} ${totalW} ${vh}`,
        preserveAspectRatio: "xMidYMid meet",
      },
      hands,
    ),
    host,
  );
  const svg = host.firstElementChild;
  if (!svg || svg.namespaceURI !== SVG_NS) throw new Error("renderHandSvg: рука не нарисовалась");
  const out = new XMLSerializer().serializeToString(svg);
  render(null, host);
  return out;
}
