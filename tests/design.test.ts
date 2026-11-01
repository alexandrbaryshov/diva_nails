import { describe, expect, it } from "vitest";
import {
  HIS_EFFECTS,
  HIS_LENGTHS,
  HIS_SHAPES,
  MAX_DECOR_PER_NAIL,
  clampForHand,
  isLongLength,
  naturalDesign,
  type Design,
} from "../src/state/design";
import { createDesignStore } from "../src/state/store";
import { MONTH_PRESET, PRESETS } from "../src/data/designs";
import { HIS_SHADES, HER_SHADES } from "../src/data/palette";

const hisIds = new Set(HIS_SHADES.map((s) => s.id));
const month = (): Design => structuredClone(MONTH_PRESET.design);

describe("модель дизайна", () => {
  it("naturalDesign — пять натуральных ногтей без покрытия, узора и декора", () => {
    const d = naturalDesign();
    expect(d.v).toBe(1);
    expect(d.hand).toBe("her");
    expect(d.nails).toHaveLength(5);
    for (const n of d.nails) expect(n).toEqual({ shade: null, effect: "gloss", pattern: "none", accent: null, decor: [] });
    const his = naturalDesign("his");
    expect(his.hand).toBe("his");
    expect(HIS_SHAPES).toContain(his.shape);
    expect(his.length).toBe("short");
  });

  it("isLongLength: длинная и экстра — это наращивание", () => {
    expect(isLongLength("short")).toBe(false);
    expect(isLongLength("medium")).toBe(false);
    expect(isLongLength("long")).toBe(true);
    expect(isLongLength("extra")).toBe(true);
  });

  it("clampForHand(his) оставляет только короткое и мужской набор", () => {
    const her = month();
    her.nails[1] = { ...her.nails[1], decor: [{ item: "sticker-heart", u: 0.53125, v: 0.53125, scale: 1, rot: 0 }] };
    const his = clampForHand({ ...her, hand: "his", shape: "stiletto", length: "extra" });
    expect(HIS_LENGTHS).toEqual(["short"]);
    expect(his.length).toBe("short");
    expect(HIS_SHAPES).toContain(his.shape);
    for (const n of his.nails) {
      expect(n.shade === null || hisIds.has(n.shade)).toBe(true);
      expect(HIS_EFFECTS).toContain(n.effect);
      expect(n.pattern).toBe("none");
      expect(n.accent).toBeNull();
      expect(n.decor).toEqual([]);
    }
  });

  it("clampForHand: «Чёрный мат» остаётся матовым, женская рука не меняется", () => {
    const d = naturalDesign("his");
    d.nails[0] = { ...d.nails[0], shade: "DNM4", effect: "gloss" };
    const clamped = clampForHand(d);
    expect(clamped.nails[0].shade).toBe("DNM4");
    expect(clamped.nails[0].effect).toBe("matte");
    for (const p of PRESETS) expect(clampForHand(p.design)).toEqual(p.design);
  });
});

describe("хранилище конструктора", () => {
  it("красит ноготь, отменяет и возвращает", () => {
    const s = createDesignStore(month());
    expect(s.canUndo.value).toBe(false);
    s.paint(0, "DN28");
    expect(s.design.value.nails[0].shade).toBe("DN28");
    expect(s.canUndo.value).toBe(true);
    s.undo();
    expect(s.design.value).toEqual(MONTH_PRESET.design);
    expect(s.canRedo.value).toBe(true);
    s.redo();
    expect(s.design.value.nails[0].shade).toBe("DN28");
    expect(s.canRedo.value).toBe(false);
  });

  it("«На все ногти» — пять ногтей одним шагом", () => {
    const s = createDesignStore(month());
    s.paint("all", "DN39");
    expect(s.design.value.nails.map((n) => n.shade)).toEqual(["DN39", "DN39", "DN39", "DN39", "DN39"]);
    s.undo();
    expect(s.design.value).toEqual(MONTH_PRESET.design);
  });

  it("история — 50 шагов отмены, не больше", () => {
    const s = createDesignStore(naturalDesign());
    const after: string[] = [];
    for (let i = 0; i < 60; i++) {
      const shade = HER_SHADES[i % HER_SHADES.length].id;
      s.paint(i % 5, shade);
      after.push(JSON.stringify(s.design.value));
    }
    let undos = 0;
    while (s.canUndo.value) {
      s.undo();
      undos++;
    }
    expect(undos).toBe(50);
    // 60 шагов, 50 отменено → состояние после 10-го шага
    expect(JSON.stringify(s.design.value)).toBe(after[9]);
  });

  it("новое действие после отмены стирает «вернуть»", () => {
    const s = createDesignStore(month());
    s.paint(0, "DN28");
    s.undo();
    s.setEffect(2, "matte");
    expect(s.canRedo.value).toBe(false);
  });

  it("reset — натуральные ногти одним шагом, рука и тон остаются, шаг отменяется", () => {
    const s = createDesignStore(month());
    s.setTone(3);
    s.toggleTwoHands();
    s.setPrint({ nail: 2, url: "blob:x", x: 0, y: 0, scale: 1, rot: 0 }, 2);
    s.setReference({ url: "blob:ref" });
    const before = JSON.stringify(s.design.value);
    s.reset();
    const d = s.design.value;
    expect(d.tone).toBe(3);
    expect(d.twoHands).toBe(true);
    expect(d.hand).toBe("her");
    for (const n of d.nails) expect(n.shade).toBeNull();
    expect(s.prints.value).toEqual([]);
    expect(s.reference.value).toBeNull();
    s.undo();
    expect(JSON.stringify(s.design.value)).toBe(before);
    expect(s.prints.value).toHaveLength(1);
    expect(s.reference.value).toEqual({ url: "blob:ref" });
  });

  it("setHand('his') зажимает дизайн под мужскую руку, отмена возвращает женский", () => {
    const s = createDesignStore(month());
    s.setHand("his");
    const d = s.design.value;
    expect(d.hand).toBe("his");
    expect(d.length).toBe("short");
    expect(HIS_SHAPES).toContain(d.shape);
    for (const n of d.nails) expect(n.shade === null || hisIds.has(n.shade)).toBe(true);
    s.setShape("stiletto");
    s.setLength("long");
    expect(s.design.value).toEqual(d);
    s.undo();
    expect(s.design.value).toEqual(MONTH_PRESET.design);
  });

  it("действие без изменений не создаёт шаг", () => {
    const s = createDesignStore(month());
    s.setShape(MONTH_PRESET.design.shape);
    s.paint(3, MONTH_PRESET.design.nails[3].shade);
    expect(s.canUndo.value).toBe(false);
  });

  it("декор: на сетке ссылки, не больше трёх на ноготь, перетаскивание — один шаг", () => {
    const s = createDesignStore(naturalDesign());
    s.addDecor(1, "rhinestone-crystal");
    const placed = s.design.value.nails[1].decor[0];
    expect(placed.item).toBe("rhinestone-crystal");
    // u, v — центры 16 клеток: (k + 0.5) / 16
    expect(placed.u * 16 - 0.5).toBe(Math.round(placed.u * 16 - 0.5));
    for (let i = 0; i < 5; i++) s.addDecor(1, "sticker-star");
    expect(s.design.value.nails[1].decor).toHaveLength(MAX_DECOR_PER_NAIL);

    const stepsBeforeDrag = JSON.stringify(s.design.value);
    s.moveDecor(1, 0, { u: 0.1, v: 0.2 });
    s.moveDecor(1, 0, { u: 0.3, v: 0.4 });
    s.moveDecor(1, 0, { u: 0.9, v: 0.81, rot: 50, scale: 1.3 });
    const moved = s.design.value.nails[1].decor[0];
    // 0.9 → клетка 14 → 14.5/16; 0.81 → клетка 12 → 12.5/16; 50° → 45°; 1.3 → 1.25
    expect(moved).toEqual({ item: "rhinestone-crystal", u: 0.90625, v: 0.78125, scale: 1.25, rot: 45 });
    s.undo();
    expect(JSON.stringify(s.design.value)).toBe(stepsBeforeDrag);

    s.removeDecor(1, 0);
    expect(s.design.value.nails[1].decor).toHaveLength(2);
  });

  it("два отдельных жеста над одним декором — два шага отмены (граница — endGesture)", () => {
    const s = createDesignStore(naturalDesign());
    s.addDecor(0, "sticker-bow");
    const placed = JSON.stringify(s.design.value);
    // жест 1: перетаскивание
    s.moveDecor(0, 0, { u: 0.1 });
    s.moveDecor(0, 0, { u: 0.2 });
    s.endGesture();
    const afterDrag = JSON.stringify(s.design.value);
    // жест 2: поворот
    s.moveDecor(0, 0, { rot: 90 });
    s.endGesture();
    const afterRotate = JSON.stringify(s.design.value);
    // жест 3: размер
    s.moveDecor(0, 0, { scale: 1.5 });
    s.endGesture();

    s.undo();
    expect(JSON.stringify(s.design.value)).toBe(afterRotate);
    s.undo();
    expect(JSON.stringify(s.design.value)).toBe(afterDrag);
    s.undo();
    expect(JSON.stringify(s.design.value)).toBe(placed);
  });

  it("действие без изменений между жестами тоже их разделяет", () => {
    const s = createDesignStore(naturalDesign());
    s.addDecor(2, "rhinestone-gold");
    s.moveDecor(2, 0, { u: 0.1 });
    const afterFirst = JSON.stringify(s.design.value);
    s.setShape(s.design.value.shape); // пустое действие
    s.moveDecor(2, 0, { u: 0.9 });
    s.undo();
    expect(JSON.stringify(s.design.value)).toBe(afterFirst);
  });

  it("принт: постановка — свой шаг, каждый жест сдвига — свой шаг", () => {
    const s = createDesignStore(naturalDesign());
    const p = { nail: 1, url: "blob:cat", x: 0, y: 0, scale: 1, rot: 0 };
    s.setPrint(p, 1);
    s.endGesture();
    s.setPrint({ ...p, x: 5 }, 1);
    s.setPrint({ ...p, x: 10 }, 1);
    s.endGesture();
    s.setPrint({ ...p, x: 10, rot: 30 }, 1);
    s.endGesture();

    s.undo();
    expect(s.prints.value).toEqual([{ ...p, x: 10 }]);
    s.undo();
    expect(s.prints.value).toEqual([p]);
    s.undo();
    expect(s.prints.value).toEqual([]);
    expect(s.canUndo.value).toBe(false);
  });

  it("пустое начало перетаскивания не поглощает постановку декора и принта", () => {
    const s = createDesignStore(naturalDesign());
    s.addDecor(0, "rhinestone-gold");
    const placed = JSON.stringify(s.design.value);
    s.moveDecor(0, 0, { ...s.design.value.nails[0].decor[0] });
    s.moveDecor(0, 0, { u: 0.9 });
    s.undo();
    expect(JSON.stringify(s.design.value)).toBe(placed);
    const p = { nail: 1, url: "blob:cat", x: 0, y: 0, scale: 1, rot: 0 };
    s.setPrint(p, 1);
    s.endGesture();
    s.setPrint(p, 1);
    s.setPrint({ ...p, x: 5 }, 1);
    s.undo();
    expect(s.prints.value).toEqual([p]);
  });

  it("load — один шаг истории, принты сбрасываются", () => {
    const s = createDesignStore(naturalDesign());
    s.setPrint({ nail: 0, url: "blob:p", x: 0, y: 0, scale: 1, rot: 0 }, 0);
    s.load(PRESETS[4].design);
    expect(s.design.value).toEqual(PRESETS[4].design);
    expect(s.prints.value).toEqual([]);
    s.undo();
    expect(s.design.value).toEqual(naturalDesign());
    expect(s.prints.value).toHaveLength(1);
  });

  it("setPattern ставит узор и второй оттенок; без accent второй оттенок не трогается", () => {
    const s = createDesignStore(naturalDesign());
    s.setPattern("all", "french", "DN40");
    expect(s.design.value.nails.every((n) => n.pattern === "french" && n.accent === "DN40")).toBe(true);
    s.setPattern(0, "lunar");
    expect(s.design.value.nails[0]).toMatchObject({ pattern: "lunar", accent: "DN40" });
  });
});
