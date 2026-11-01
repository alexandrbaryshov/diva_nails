import { describe, expect, it } from "vitest";
import { cardDate, cardLines, cardShapeLine } from "../src/card/lines";
import { qrGeometry, QR_BOX } from "../src/card/layout";
import { qrMatrix } from "../src/card/qr";
import { naturalDesign, type Design } from "../src/state/design";

function withNails(patch: (i: number) => Partial<Design["nails"][number]>): Design {
  const d = naturalDesign("her");
  return { ...d, nails: d.nails.map((n, i) => ({ ...n, ...patch(i) })) as Design["nails"] };
}

describe("cardLines — что на каждом ногте", () => {
  it("пять строк «палец — оттенок, эффект, узор, декор»", () => {
    const d = withNails((i) =>
      i === 3
        ? { shade: "DN22", effect: "chrome", pattern: "french", decor: [{ item: "rhinestone-pearl", u: 0.5, v: 0.5, scale: 1, rot: 0 }] }
        : { shade: "DN01", effect: "gloss" },
    );
    const lines = cardLines(d);
    expect(lines).toHaveLength(5);
    expect(lines.map((l) => l.nail)).toEqual(["Большой", "Указательный", "Средний", "Безымянный", "Мизинец"]);
    expect(lines[0].text).toBe("DN 01 · Молочный");
    expect(lines[3].text).toMatch(/^DN 22 · Терракота, хром, френч, декор: Жемчужина$/);
  });

  it("без покрытия — так и написано", () => {
    expect(cardLines(naturalDesign("her"))[0].text).toBe("без покрытия");
  });

  it("форма и длина, дата по-русски", () => {
    const d = { ...naturalDesign("her"), shape: "almond", length: "medium" } as Design;
    expect(cardShapeLine(d)).toBe("Миндаль, средняя длина");
    expect(cardDate(new Date(2026, 9, 24))).toMatch(/^24 октября 2026/);
  });
});

describe("QR на карточке", () => {
  it("модули целыми пикселями и целиком в своём квадрате с полями", () => {
    const url = "https://alexandrbaryshov.github.io/diva_nails/d/#d=AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB";
    const m = qrMatrix(url);
    expect(m.length).toBe(m[0].length);
    const g = qrGeometry(m.length);
    expect(Number.isInteger(g.module) && g.module >= 4).toBe(true);
    expect(g.x0 - QR_BOX.x).toBeGreaterThanOrEqual(g.module * QR_BOX.quiet - 1);
    expect(g.x0 + g.module * m.length).toBeLessThanOrEqual(QR_BOX.x + QR_BOX.size);
  });
});
