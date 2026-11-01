import { describe, expect, it } from "vitest";
import { pickPresets } from "../src/constructor/start/pick";
import { surprise, surpriseDifferent } from "../src/constructor/start/surprise";
import { MOODS, OCCASIONS, PRESETS, QUIZ_LENGTHS, type Mood, type Occasion } from "../src/data/designs";
import { HER_SHADES, HIS_SHADES, SHADES, shadeById } from "../src/data/palette";
import { HIS_LENGTHS, HIS_SHAPES, type Design, type Length } from "../src/state/design";

/** Детерминированный генератор (LCG) — воспроизводимые «случайные» дизайны. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const ids = (list: readonly { id: string }[]) => list.map((p) => p.id);

describe("pickPresets — «Подбери мне»", () => {
  it("всегда три разных дизайна из ленты", () => {
    for (const occasion of OCCASIONS)
      for (const mood of MOODS)
        for (const length of QUIZ_LENGTHS) {
          const out = pickPresets({ occasion, mood, length }, PRESETS);
          expect(out).toHaveLength(3);
          expect(new Set(ids(out)).size).toBe(3);
          for (const p of out) expect(PRESETS).toContain(p);
        }
  });

  it("сначала то, что совпало по всем трём ответам (разобрано по data/designs.json)", () => {
    // праздник + дерзко + длинные: ровно три таких дизайна в ленте
    expect(new Set(ids(pickPresets({ occasion: "party", mood: "bold", length: "long" }, PRESETS)))).toEqual(
      new Set(["cherry-cat-eye", "bordeaux-gold", "black-chrome"]),
    );
    // офис + нежно + короткие: совпадений по всем трём ответам больше трёх — все три выданных из них
    for (const p of pickPresets({ occasion: "office", mood: "soft", length: "short" }, PRESETS)) {
      expect(p.tags.occasion).toContain("office");
      expect(p.tags.mood).toBe("soft");
      expect(p.tags.length).toBe("short");
    }
    // свидание + дерзко + длинные — единственный полный: вишнёвый кошачий глаз, он первый
    expect(pickPresets({ occasion: "date", mood: "bold", length: "long" }, PRESETS)[0].id).toBe("cherry-cat-eye");
  });

  it("каждый ответ меняет выдачу", () => {
    const key = (o: Occasion, m: Mood, l: Length) => ids(pickPresets({ occasion: o, mood: m, length: l }, PRESETS)).join(",");
    for (const o of OCCASIONS)
      for (const m of MOODS)
        for (const l of QUIZ_LENGTHS) {
          const base = key(o, m, l);
          for (const o2 of OCCASIONS) if (o2 !== o) expect(key(o2, m, l), `${o}→${o2} при ${m}/${l}`).not.toBe(base);
          for (const m2 of MOODS) if (m2 !== m) expect(key(o, m2, l), `${m}→${m2} при ${o}/${l}`).not.toBe(base);
          for (const l2 of QUIZ_LENGTHS) if (l2 !== l) expect(key(o, m, l2), `${l}→${l2} при ${o}/${m}`).not.toBe(base);
        }
  });
});

function shadesOf(d: Design): string[] {
  const out = new Set<string>();
  for (const n of d.nails) {
    if (n.shade) out.add(n.shade);
    if (n.accent) out.add(n.accent);
  }
  return [...out];
}

describe("surprise — «Удиви меня»", () => {
  it("только оттенки палитры; база + до двух акцентов одной семьи", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const d = surprise(seeded(seed), HER_SHADES, "her");
      expect(d.hand).toBe("her");
      const used = shadesOf(d);
      for (const id of used) expect(HER_SHADES.map((s) => s.id)).toContain(id);
      // база — самый частый оттенок ногтей
      const count = new Map<string, number>();
      for (const n of d.nails) if (n.shade) count.set(n.shade, (count.get(n.shade) ?? 0) + 1);
      const base = [...count.entries()].sort((a, b) => b[1] - a[1])[0][0];
      const accents = used.filter((id) => id !== base);
      expect(accents.length, `seed ${seed}: ${used}`).toBeLessThanOrEqual(2);
      expect(new Set(accents.map((id) => shadeById(id)!.family)).size, `seed ${seed}`).toBeLessThanOrEqual(1);
    }
  });

  it("мужская рука — только мужской набор, короткие формы, без узоров и декора", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const d = surprise(seeded(seed), HIS_SHADES, "his");
      expect(d.hand).toBe("his");
      expect(HIS_SHAPES).toContain(d.shape);
      expect(HIS_LENGTHS).toContain(d.length);
      for (const n of d.nails) {
        expect(n.shade === null || HIS_SHADES.some((s) => s.id === n.shade)).toBe(true);
        expect(n.pattern).toBe("none");
        expect(n.decor).toEqual([]);
      }
    }
  });

  it("два подряд — разные, даже если генератор упрямый", () => {
    const rng = seeded(7);
    let prev = surprise(rng, HER_SHADES, "her");
    for (let i = 0; i < 100; i++) {
      const next = surpriseDifferent(rng, HER_SHADES, "her", prev);
      expect(JSON.stringify(next)).not.toBe(JSON.stringify(prev));
      prev = next;
    }
    const stuck = () => 0;
    const a = surprise(stuck, HER_SHADES, "her");
    const b = surpriseDifferent(stuck, HER_SHADES, "her", a);
    expect(JSON.stringify(b)).not.toBe(JSON.stringify(a));
    const c = surpriseDifferent(stuck, HIS_SHADES, "his", surprise(stuck, HIS_SHADES, "his"));
    expect(JSON.stringify(c)).not.toBe(JSON.stringify(surprise(stuck, HIS_SHADES, "his")));
  });

  it("берёт оттенки из переданной палитры", () => {
    const few = SHADES.filter((s) => s.family === "berry");
    for (let seed = 1; seed <= 30; seed++) for (const id of shadesOf(surprise(seeded(seed), few, "her"))) expect(few.map((s) => s.id)).toContain(id);
  });
});
