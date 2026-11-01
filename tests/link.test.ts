import { describe, expect, it } from "vitest";
import {
  createLinkCodec,
  decodeDesign,
  designUrl,
  encodeDesign,
  readDesignFromLocation,
  writeDesignToLocation,
} from "../src/state/link";
import {
  DECOR_ROT_STEP,
  DECOR_SCALES,
  EFFECTS,
  LENGTHS,
  MAX_DECOR_PER_NAIL,
  PATTERNS,
  SHAPES,
  clampForHand,
  naturalDesign,
  type Design,
  type Nail,
} from "../src/state/design";
import { DECOR, HER_SHADES, SHADES, nearestShade, type Shade } from "../src/data/palette";
import { MONTH_PRESET, PRESETS } from "../src/data/designs";

// Алфавит base64url из RFC 4648 — чтобы подменить байт версии, не опираясь на код под тестом.
const B64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
/** Тот же код, но в первом байте версия 2 вместо 1: первые 8 бит — символ 1 и два старших бита символа 2. */
function otherVersion(code: string): string {
  const second = B64URL.indexOf(code[1]);
  return "A" + B64URL[(second & 0b001111) | 0b100000] + code.slice(2);
}

const SITE = "https://alexandrbaryshov.github.io/diva_nails/";

// Детерминированный генератор случайных чисел (mulberry32), чтобы падение воспроизводилось.
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(r: () => number, list: readonly T[]): T {
  return list[Math.floor(r() * list.length)];
}

/** Случайный допустимый дизайн: значения из областей модели, декор на сетке 16 клеток. */
function randomDesign(r: () => number, full = false): Design {
  const nail = (): Nail => ({
    shade: !full && r() < 0.15 ? null : pick(r, SHADES).id,
    effect: pick(r, EFFECTS),
    pattern: pick(r, PATTERNS),
    accent: !full && r() < 0.5 ? null : pick(r, HER_SHADES).id,
    decor: Array.from({ length: full ? MAX_DECOR_PER_NAIL : Math.floor(r() * (MAX_DECOR_PER_NAIL + 1)) }, () => ({
      item: pick(r, DECOR).id,
      u: (Math.floor(r() * 16) + 0.5) / 16,
      v: (Math.floor(r() * 16) + 0.5) / 16,
      scale: pick(r, DECOR_SCALES),
      rot: Math.floor(r() * 8) * DECOR_ROT_STEP,
    })),
  });
  const d: Design = {
    v: 1,
    hand: full || r() < 0.8 ? "her" : "his",
    tone: pick(r, [0, 1, 2, 3] as const),
    twoHands: r() < 0.5,
    shape: pick(r, SHAPES),
    length: pick(r, LENGTHS),
    nails: [nail(), nail(), nail(), nail(), nail()],
  };
  return clampForHand(d);
}

describe("ссылка на дизайн", () => {
  it("круг encode → decode без потерь для всех пресетов", () => {
    for (const p of PRESETS) {
      expect(decodeDesign(encodeDesign(p.design)), p.id).toEqual({ design: p.design, warnings: [] });
    }
  });

  it("круг без потерь для 500 случайных дизайнов (и мужских)", () => {
    const r = rng(20261024);
    for (let i = 0; i < 500; i++) {
      const d = randomDesign(r);
      const code = encodeDesign(d);
      expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(decodeDesign(code)).toEqual({ design: d, warnings: [] });
    }
  });

  it("designUrl — /d/#d=…, вся ссылка ≤ 120 символов даже у самого тяжёлого дизайна", () => {
    const r = rng(7);
    const heavy = Array.from({ length: 50 }, () => randomDesign(r, true));
    for (const d of [...PRESETS.map((p) => p.design), ...heavy]) {
      const url = designUrl(d);
      expect(url.startsWith(`${SITE}d/#d=`)).toBe(true);
      expect(url.length).toBeLessThanOrEqual(120);
    }
    expect(designUrl(MONTH_PRESET.design).length).toBeLessThan(90);
  });

  it("битая строка → null", () => {
    const good = encodeDesign(MONTH_PRESET.design);
    for (const bad of ["", "!!!", "abc$", "A", "AAAA", good.slice(0, -4), `${good}AAAA`, good.replace(/^./, "/")]) {
      expect(decodeDesign(bad), JSON.stringify(bad)).toBeNull();
    }
  });

  it("ссылка другой версии формата → null", () => {
    const code = encodeDesign(MONTH_PRESET.design);
    expect(code.startsWith("A")).toBe(true);
    expect(decodeDesign(otherVersion(code))).toBeNull();
  });

  it("пропавший оттенок → ближайший по цвету и предупреждение", () => {
    const gone: Shade = { id: "DN99", idx: 99, code: "DN 99", name: "Снятый", brand: null, hex: "#F2E6DC", family: "milk", stub: true };
    const before = createLinkCodec({ shades: [...SHADES, gone], retired: [], decor: DECOR });
    const after = createLinkCodec({
      shades: SHADES,
      retired: [{ id: gone.id, idx: gone.idx, code: gone.code, name: gone.name, hex: gone.hex }],
      decor: DECOR,
    });
    const d = naturalDesign();
    d.nails[2] = { ...d.nails[2], shade: "DN99" };
    const res = after.decodeDesign(before.encodeDesign(d));
    // у DN 01 тот же цвет #F2E6DC — ближе не бывает
    expect(res?.design.nails[2].shade).toBe("DN01");
    expect(res?.warnings).toEqual(["unknown-shade"]);

    const unknown = createLinkCodec({ shades: SHADES, retired: [], decor: DECOR }).decodeDesign(before.encodeDesign(d));
    expect(unknown?.design.nails[2].shade).toBeNull();
    expect(unknown?.warnings).toEqual(["unknown-shade"]);
  });

  it("nearestShade находит почти тот же цвет", () => {
    expect(nearestShade("#F2E6DD").id).toBe("DN01");
    expect(nearestShade("#1C1A1C", HER_SHADES).id).toBe("DN39");
  });
});

describe("ссылка в адресе страницы", () => {
  it("readDesignFromLocation: нет #d= → null; хорошая → дизайн; битая и старая → дизайн месяца с пометкой", () => {
    const at = (hash: string) => ({ hash }) as Location;
    expect(readDesignFromLocation(at(""))).toBeNull();
    expect(readDesignFromLocation(at("#x=1"))).toBeNull();
    const d = PRESETS[5].design;
    expect(readDesignFromLocation(at(`#d=${encodeDesign(d)}`))).toEqual({ design: d, warnings: [] });
    expect(readDesignFromLocation(at("#d=%%%"))).toEqual({ design: MONTH_PRESET.design, warnings: ["bad-link"] });
    expect(readDesignFromLocation(at("#d="))).toEqual({ design: MONTH_PRESET.design, warnings: ["bad-link"] });
    const old = otherVersion(encodeDesign(d));
    expect(readDesignFromLocation(at(`#d=${old}`))).toEqual({ design: MONTH_PRESET.design, warnings: ["old-version"] });
  });

  it("writeDesignToLocation пишет #d=… через replaceState, не засоряя историю", () => {
    history.replaceState(null, "", "/diva_nails/?author=1");
    const len = history.length;
    const d = PRESETS[2].design;
    writeDesignToLocation(d);
    expect(location.pathname).toBe("/diva_nails/");
    expect(location.search).toBe("?author=1");
    expect(location.hash).toBe(`#d=${encodeDesign(d)}`);
    expect(history.length).toBe(len);
    expect(readDesignFromLocation(location)).toEqual({ design: d, warnings: [] });
  });
});
