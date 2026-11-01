import { cleanup, fireEvent, render } from "@testing-library/preact";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HandView } from "../src/constructor/HandView";
import { HANDS } from "../src/constructor/hands";
import { renderHandSvg } from "../src/constructor/renderHand";
import { PresetThumb } from "../src/constructor/start/PresetThumb";
import { MONTH_PRESET } from "../src/data/designs";
import { shadeById } from "../src/data/palette";
import { EFFECTS, PATTERNS, naturalDesign, type Design, type Nail } from "../src/state/design";

afterEach(cleanup);

function design(patch: Partial<Design> = {}, nail: Partial<Nail> = {}): Design {
  const d = naturalDesign("her");
  return { ...d, ...patch, nails: d.nails.map((n) => ({ ...n, ...nail })) as Design["nails"] };
}

const nails = (c: Element) => [...c.querySelectorAll("[data-nail]")];
const outerNails = (c: Element) => nails(c).filter((n) => n.tagName.toLowerCase() === "g");

describe("HandView", () => {
  it("рука — <image href> SVG-файла тона, ногти — пять отдельных контуров поверх", () => {
    const { container } = render(<HandView design={design({ tone: 2 })} />);
    const img = container.querySelectorAll("svg > g > image");
    expect(img).toHaveLength(1);
    expect(img[0].getAttribute("href")).toBe(HANDS.her.tones[2]);
    expect(HANDS.her.tones[2]).toMatch(/hands\/her-2\.svg$/);
    expect(outerNails(container)).toHaveLength(5);
    for (const g of outerNails(container)) expect(g.querySelector("clipPath path")?.getAttribute("d")).toMatch(/^M.+Z$/);
  });

  it("мужская рука — своя иллюстрация", () => {
    const { container } = render(<HandView design={naturalDesign("his")} />);
    expect(container.querySelector("image")?.getAttribute("href")).toMatch(/hands\/his-\d\.svg$/);
    expect(HANDS.his.anchors).not.toEqual(HANDS.her.anchors);
  });

  it("смена тона не меняет ногти", () => {
    const d = design({}, { shade: "DN26", effect: "chrome", pattern: "french" });
    const a = render(<HandView design={{ ...d, tone: 0 }} />).container;
    const html0 = outerNails(a).map((n) => n.innerHTML.replace(/h[A-Za-z0-9_-]+-n/g, "ID-n"));
    cleanup();
    const b = render(<HandView design={{ ...d, tone: 3 }} />).container;
    const html3 = outerNails(b).map((n) => n.innerHTML.replace(/h[A-Za-z0-9_-]+-n/g, "ID-n"));
    expect(html3).toEqual(html0);
    expect(b.querySelector("image")?.getAttribute("href")).not.toBe(a.querySelector("image")?.getAttribute("href"));
  });

  it("форма и длина меняют контур всех пяти ногтей", () => {
    const outline = (d: Design) => outerNails(render(<HandView design={d} />).container).map((g) => g.querySelector("clipPath path")!.getAttribute("d"));
    const a = outline(design({ shape: "oval", length: "short" }));
    cleanup();
    const b = outline(design({ shape: "stiletto", length: "extra" }));
    a.forEach((d, i) => expect(b[i]).not.toBe(d));
  });

  it("ноготь красится оттенком палитры; натуральный — без покрытия", () => {
    const hex = shadeById("DN26")!.hex.toLowerCase();
    const d = design();
    d.nails[3] = { ...d.nails[3], shade: "DN26" };
    const { container } = render(<HandView design={d} />);
    const [thumb, , , ring] = outerNails(container);
    expect(ring.innerHTML.toLowerCase()).toContain(hex);
    expect(thumb.innerHTML.toLowerCase()).not.toContain(hex);
  });

  it("7 эффектов и 7 узоров дают разную отрисовку, только SVG-средствами", () => {
    const paint = (nail: Partial<Nail>) => {
      const { container } = render(<HandView design={design({}, { shade: "DN18", ...nail })} />);
      const g = outerNails(container)[2];
      const html = g.innerHTML.replace(/h[A-Za-z0-9_-]+-n/g, "ID-n");
      expect(g.querySelector("image"), "без растров в ногте").toBeNull();
      cleanup();
      return html;
    };
    const effects = new Set(EFFECTS.map((effect) => paint({ effect })));
    expect(effects.size).toBe(7);
    const patterns = new Set(PATTERNS.map((pattern) => paint({ pattern })));
    expect(patterns.size).toBe(8);
  });

  it("декор и принт рисуются внутри clipPath ногтя", () => {
    const d = design();
    d.nails[1] = { ...d.nails[1], shade: "DN01", decor: [{ item: "rhinestone-crystal", u: 0.5, v: 0.5, scale: 1, rot: 0 }, { item: "sticker-heart", u: 0.3, v: 0.7, scale: 1.25, rot: 45 }] };
    const prints = [{ nail: 1, url: "blob:print-1", x: 0.5, y: 0.5, scale: 1, rot: 0 }];
    const { container } = render(<HandView design={d} prints={prints} />);
    const g = outerNails(container)[1];
    const clipped = g.querySelector("[clip-path]")!;
    const clipId = /url\(#(.+)\)/.exec(clipped.getAttribute("clip-path")!)![1];
    expect(g.querySelector(`clipPath[id="${clipId}"]`)).not.toBeNull();
    expect(clipped.querySelectorAll("[data-decor]")).toHaveLength(2);
    expect(clipped.querySelector("image")?.getAttribute("href")).toBe("blob:print-1");
    expect(outerNails(container)[0].querySelector("image")).toBeNull();
  });

  it("контур ногтя — тонкий тёмно-коричневый, одной толщины на всех пальцах (как обводка пальцев макета)", () => {
    const d = design({}, { shade: "DN13" });
    d.nails[3] = { ...d.nails[3], shade: "DN29", effect: "chrome" };
    const { container } = render(<HandView design={d} />);
    const outlines = outerNails(container).map((g) => g.querySelector(":scope > path:last-of-type")!);
    const widths = outlines.map((p) => Number(p.getAttribute("stroke-width")));
    expect(new Set(widths).size, `толщины: ${widths.join(", ")}`).toBe(1);
    // обводка пальцев в макете ≈ 6 px при 1 px = 1.405 единицы руки
    expect(widths[0]).toBeGreaterThanOrEqual(7);
    expect(widths[0]).toBeLessThanOrEqual(9.5);
    for (const p of outlines) {
      const hex = p.getAttribute("stroke")!;
      expect(hex, "цвет контура — #rrggbb").toMatch(/^#[0-9a-f]{6}$/i);
      const n = parseInt(hex.slice(1), 16);
      const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      expect((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255, `${hex} — тёмный`).toBeLessThan(0.35);
      expect(r, `${hex} — коричневый, теплее серого`).toBeGreaterThan(b);
    }
  });

  it("mirrored — та же рука зеркально", () => {
    const { container } = render(<HandView design={design()} mirrored />);
    expect(container.querySelector("svg > g")?.getAttribute("transform")).toMatch(/scale\(-1 1\)/);
  });

  it("интерактивные ногти — кнопки: тап, Enter, отмеченный выбранный", () => {
    const onNailTap = vi.fn();
    const { container } = render(<HandView design={design()} interactive selected={3} onNailTap={onNailTap} />);
    const buttons = container.querySelectorAll('[role="button"]');
    expect(buttons).toHaveLength(5);
    expect(buttons[0].getAttribute("aria-label")).toMatch(/^Большой/);
    expect(buttons[3].getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(buttons[2]);
    expect(onNailTap).toHaveBeenLastCalledWith(2);
    fireEvent.keyDown(buttons[4], { key: "Enter" });
    expect(onNailTap).toHaveBeenLastCalledWith(4);
  });

  it("стрелки переводят фокус между ногтями по кругу", () => {
    const { container } = render(<HandView design={design()} interactive />);
    const buttons = [...container.querySelectorAll<SVGGElement>('[role="button"]')];
    buttons[1].focus();
    fireEvent.keyDown(buttons[1], { key: "ArrowRight" });
    expect(document.activeElement).toBe(buttons[2]);
    fireEvent.keyDown(buttons[2], { key: "ArrowLeft" });
    expect(document.activeElement).toBe(buttons[1]);
    buttons[4].focus();
    fireEvent.keyDown(buttons[4], { key: "ArrowRight" });
    expect(document.activeElement).toBe(buttons[0]);
  });

  it("без interactive ногти не кнопки", () => {
    const { container } = render(<HandView design={design()} />);
    expect(container.querySelectorAll('[role="button"]')).toHaveLength(0);
  });
});

describe("PresetThumb — миниатюра ленты «Дизайн месяца»", () => {
  // Рамка контура по опорным точкам d (абсолютные M/L/C/A/Z; у кривых — вместе с ручками, для рамки этого хватает).
  function box(d: string) {
    const tokens = d.match(/[MLCAZ]|-?\d*\.?\d+/g) ?? [];
    const xs: number[] = [];
    const ys: number[] = [];
    let cmd = "M";
    for (let i = 0; i < tokens.length; ) {
      if (/[MLCAZ]/.test(tokens[i])) {
        cmd = tokens[i++];
        continue;
      }
      const take = cmd === "A" ? 7 : 2;
      const n = tokens.slice(i, i + take).map(Number);
      i += take;
      xs.push(n[take - 2]);
      ys.push(n[take - 1]);
    }
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  }

  it("как в макете: стройный палец, вытянутый ноготь сверху, дизайн на ногте", () => {
    const d = { ...MONTH_PRESET.design, nails: MONTH_PRESET.design.nails.map((n) => ({ ...n, shade: "DN26", pattern: "french" as const })) } as Design;
    const { container } = render(<PresetThumb design={d} uid="t1" tone={1} />);
    const svg = container.querySelector("svg")!;
    const [, , , vh] = svg.getAttribute("viewBox")!.split(" ").map(Number);
    const nail = box(svg.querySelector("[data-thumb-nail]")!.getAttribute("d")!);
    const finger = box(svg.querySelector("[data-thumb-finger]")!.getAttribute("d")!);
    const nw = nail.x1 - nail.x0;
    const nl = nail.y1 - nail.y0;
    // макет (comp-1.png, карточка 302×311 px): ноготь 78×168 px — длина ≈ 2.15 ширины; палец внизу 120 px — ≈ 1.54 ширины ногтя
    expect(nl / nw, `ноготь ${nw.toFixed(1)}×${nl.toFixed(1)}`).toBeGreaterThan(1.95);
    expect(nl / nw).toBeLessThan(2.4);
    expect((finger.x1 - finger.x0) / nw, "палец к ширине ногтя").toBeGreaterThan(1.35);
    expect((finger.x1 - finger.x0) / nw).toBeLessThan(1.75);
    // кончик ногтя — в верхней четверти, кутикула — около трёх четвертей высоты, палец уходит за низ
    expect(nail.y0 / vh).toBeGreaterThan(0);
    expect(nail.y0 / vh).toBeLessThan(0.25);
    expect(nail.y1 / vh).toBeGreaterThan(0.62);
    expect(nail.y1 / vh).toBeLessThan(0.82);
    expect(finger.y1).toBeGreaterThanOrEqual(vh);
    // дизайн пресета на ногте: оттенок и узор
    expect(svg.innerHTML.toLowerCase()).toContain(shadeById("DN26")!.hex.toLowerCase());
  });
});

describe("renderHandSvg", () => {
  const HAND_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h10v10z"/></svg>';

  function stubFetch() {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(String(url));
        if (String(url).endsWith(".svg")) return new Response(HAND_SVG, { headers: { "content-type": "image/svg+xml" } });
        return new Response(new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" }));
      }),
    );
    return calls;
  }

  it("самодостаточная строка SVG: размеры, все href — data URI", async () => {
    const calls = stubFetch();
    const d = design({ tone: 1 }, { shade: "DN26", effect: "chrome" });
    const svg = await renderHandSvg(d, [{ nail: 2, url: "blob:local-print", x: 0.5, y: 0.5, scale: 1, rot: 0 }], { width: 900, height: 1200, twoHands: false });
    expect(svg).toMatch(/^<svg[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    expect(svg).toMatch(/width="900"/);
    expect(svg).toMatch(/height="1200"/);
    const hrefs = [...svg.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
    expect(hrefs.length).toBeGreaterThanOrEqual(2);
    for (const h of hrefs) expect(h.startsWith("data:"), h.slice(0, 40)).toBe(true);
    expect(calls).toContain(HANDS.her.tones[1]);
    expect(calls).toContain("blob:local-print");
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    expect(doc.querySelector("parsererror")).toBeNull();
    expect(doc.querySelectorAll("g[data-nail]")).toHaveLength(5);
  });

  it("две руки — десять ногтей, вторая зеркальная", async () => {
    stubFetch();
    const svg = await renderHandSvg(design({ twoHands: true }), [], { width: 1000, height: 800, twoHands: true });
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    expect(doc.querySelectorAll("g[data-nail]")).toHaveLength(10);
    expect(doc.querySelectorAll("[data-mirrored]")).toHaveLength(1);
    const ids = [...doc.querySelectorAll("[id]")].map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
