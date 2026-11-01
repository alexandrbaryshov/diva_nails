import { describe, expect, it } from "vitest";
import { DECOR, HER_SHADES, HIS_SHADES, RETIRED_SHADES, SHADES } from "../src/data/palette";
import { MONTH_PRESET, MOODS, OCCASIONS, PRESETS, QUIZ_LENGTHS } from "../src/data/designs";
import { EFFECTS, LENGTHS, PATTERNS, SHAPES } from "../src/state/design";
import { STUDIO } from "../src/data/studio";
import { SERVICES } from "../src/data/services";
import { FAQ } from "../src/data/faq";
import { REVIEWS } from "../src/data/reviews";
import { WORKS } from "../src/data/works";
import { MASTERS, VISIT_STEPS } from "../src/data/visit";

const FAMILIES = ["milk", "nude", "pink", "caramel", "berry", "red", "brown", "grey", "black", "white", "clear"];
const CYRILLIC = /^[А-ЯЁ][а-яё\- ]+$/u;

describe("data/palette.json", () => {
  it("40 временных оттенков DN 01…DN 40: бренд уточняется, stub, русские названия", () => {
    expect(HER_SHADES).toHaveLength(40);
    HER_SHADES.forEach((s, i) => {
      const n = String(i + 1).padStart(2, "0");
      expect(s.code).toBe(`DN ${n}`);
      expect(s.id).toBe(`DN${n}`);
      expect(s.brand).toBeNull();
      expect(s.stub).toBe(true);
      expect(s.name).toMatch(CYRILLIC);
      expect(s.hex).toMatch(/^#[0-9A-F]{6}$/);
      expect(FAMILIES).toContain(s.family);
    });
  });

  it("мужской набор — 4 записи: без покрытия, матовое укрепление, прозрачный глянец, чёрный мат", () => {
    expect(HIS_SHADES.map((s) => s.name)).toEqual([
      "Без покрытия",
      "Матовое укрепление",
      "Прозрачный глянец",
      "Чёрный мат",
    ]);
    for (const s of HIS_SHADES) {
      expect(s.forHis).toBe(true);
      expect(s.brand).toBeNull();
      expect(s.stub).toBe(true);
      expect(s.hex).toMatch(/^#[0-9A-F]{6}$/);
    }
    expect(SHADES).toHaveLength(44);
  });

  it("id и idx оттенков уникальны (с учётом снятых), idx в 1..255", () => {
    const all = [...SHADES, ...RETIRED_SHADES];
    expect(new Set(all.map((s) => s.id)).size).toBe(all.length);
    expect(new Set(all.map((s) => s.idx)).size).toBe(all.length);
    for (const s of all) {
      expect(Number.isInteger(s.idx)).toBe(true);
      expect(s.idx).toBeGreaterThanOrEqual(1);
      expect(s.idx).toBeLessThanOrEqual(255);
    }
  });

  it("декор: не меньше 3 страз и 4 наклеек, idx уникальны и влезают в 4 бита", () => {
    expect(DECOR.filter((d) => d.kind === "rhinestone").length).toBeGreaterThanOrEqual(3);
    expect(DECOR.filter((d) => d.kind === "sticker").length).toBeGreaterThanOrEqual(4);
    expect(new Set(DECOR.map((d) => d.id)).size).toBe(DECOR.length);
    expect(new Set(DECOR.map((d) => d.idx)).size).toBe(DECOR.length);
    for (const d of DECOR) {
      expect(d.idx).toBeGreaterThanOrEqual(0);
      expect(d.idx).toBeLessThanOrEqual(15);
      expect(d.name).toMatch(CYRILLIC);
    }
  });
});

describe("data/designs.json", () => {
  it("12–15 дизайнов сезона, ровно один — дизайн месяца", () => {
    expect(PRESETS.length).toBeGreaterThanOrEqual(12);
    expect(PRESETS.length).toBeLessThanOrEqual(15);
    expect(PRESETS.filter((p) => p.month)).toHaveLength(1);
    expect(MONTH_PRESET.month).toBe(true);
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length);
  });

  it("теги покрывают все ответы квиза, длина тега = длина дизайна", () => {
    for (const o of OCCASIONS) expect(PRESETS.some((p) => p.tags.occasion.includes(o))).toBe(true);
    for (const m of MOODS) expect(PRESETS.some((p) => p.tags.mood === m)).toBe(true);
    for (const l of QUIZ_LENGTHS) expect(PRESETS.some((p) => p.tags.length === l)).toBe(true);
    for (const p of PRESETS) expect(p.tags.length).toBe(p.design.length);
  });

  it("каждый дизайн полный, а все оттенки и декор существуют в палитре", () => {
    const shadeIds = new Set(HER_SHADES.map((s) => s.id));
    const decorIds = new Set(DECOR.map((d) => d.id));
    for (const p of PRESETS) {
      expect(p.title).toMatch(/^[А-ЯЁ]/u);
      expect(p.stub).toBe(true);
      const d = p.design;
      expect(d.v).toBe(1);
      expect(d.hand).toBe("her");
      expect(SHAPES).toContain(d.shape);
      expect(LENGTHS).toContain(d.length);
      expect(d.nails).toHaveLength(5);
      for (const n of d.nails) {
        if (n.shade !== null) expect(shadeIds, `${p.id}: ${n.shade}`).toContain(n.shade);
        if (n.accent !== null) expect(shadeIds, `${p.id}: ${n.accent}`).toContain(n.accent);
        expect(EFFECTS).toContain(n.effect);
        expect(PATTERNS).toContain(n.pattern);
        for (const dec of n.decor) expect(decorIds, `${p.id}: ${dec.item}`).toContain(dec.item);
      }
    }
  });
});

// Ожидаемые значения — из facts.md, не из data/.
describe("data/studio.json — только факты facts.md", () => {
  it("название, адрес, связь, рейтинг, реквизиты", () => {
    expect(STUDIO.name).toBe("Diva Nails");
    expect(STUDIO.kind).toBe("ногтевая студия, салон красоты");
    expect(STUDIO.city).toBe("Чебоксары");
    expect(STUDIO.address).toBe("проспект Ленина, 7, корп. 1");
    expect(STUDIO.phone).toEqual({ display: "+7 952 759-06-59", href: "tel:+79527590659" });
    expect(STUDIO.telegram).toEqual({ username: "divanail21", url: "https://t.me/divanail21" });
    expect(STUDIO.whatsapp).toBe("https://wa.me/79527590659");
    expect(STUDIO.vk).toBe("https://vk.ru/diva_nail21");
    expect(STUDIO.rating.value).toBe(5);
    expect(STUDIO.rating.count).toBe(162);
    expect(STUDIO.rating.url).toMatch(/^https:\/\/yandex\.ru\/maps\//);
    expect(decodeURIComponent(STUDIO.rating.url)).toContain("Diva Nails");
    expect(STUDIO.amenities).toEqual(["card", "wifi"]);
    expect(STUDIO.legal).toEqual({ form: "ИП", inn: "213006606123", ogrnip: "315213000010059", fullName: null });
    expect(STUDIO.siteUrl).toBe("https://alexandrbaryshov.github.io/diva_nails/");
  });

  it("неизвестное — null", () => {
    expect(STUDIO.phone2).toBeNull();
    expect(STUDIO.hours).toBeNull();
    expect(STUDIO.entrance).toBeNull();
    expect(STUDIO.since).toBeNull();
    expect(STUDIO.yclientsUrl).toBe("https://n295040.yclients.com/company/285468/record-type?o=");
    expect(STUDIO.metrikaId).toBeNull();
    expect(STUDIO.logo).toBeNull();
  });
});

describe("остальные файлы данных", () => {
  it("услуги: 5 категорий брифа, прайс уточняется, конструктор — у первых четырёх", () => {
    expect(SERVICES).toHaveLength(8);
    expect(SERVICES.reduce((n, s) => n + (s.items?.length ?? 0), 0)).toBe(64);
    expect(SERVICES[0].items?.[0].price).toBe("2 200 ₽");
  });

  it("вопросы: 8 из брифа; ответы — только известные факты", () => {
    expect(FAQ.map((f) => f.q)).toEqual([
      "Как стерилизуете инструменты?",
      "Сколько держится покрытие?",
      "Что если через пару дней появился скол?",
      "Сколько длится процедура?",
      "Можно прийти с ребёнком?",
      "Где припарковаться?",
      "Как оплатить?",
      "Делаете ли маникюр мужчинам и как это проходит?",
    ]);
    const answered = FAQ.filter((f) => f.a !== null);
    expect(answered.map((f) => f.id)).toEqual(["payment", "men"]);
    expect(answered.every((f) => f.pending !== null)).toBe(true);
  });

  it("отзывы: две цитаты и два пересказа из брифа, других нет", () => {
    expect(REVIEWS).toEqual([
      { id: "nesterova", kind: "quote", text: "Это место создано прям для женщин, всё продумано до мелочей!", author: "Александра Нестерова", master: null },
      { id: "alina", kind: "quote", text: "Сюда можно приходить, девчонки-мастера точно не подведут!", author: "Алина", master: null },
      { id: "irina-v", kind: "retelling", text: "аккуратно и красиво, помогла с выбором и выровняла ногтевую пластину", author: "Ирина В.", master: "Алевтина" },
      { id: "pyrenkova", kind: "retelling", text: "рекомендации и забота в подологии, «любимое место»", author: "v.pyrenkovaa", master: "Диана" },
    ]);
  });

  it("визит: 6 шагов брифа, мастера из отзывов, работ пока нет", () => {
    expect(VISIT_STEPS.map((s) => s.id)).toEqual(["booking", "welcome", "brief", "tools", "work", "care"]);
    const welcome = VISIT_STEPS.find((s) => s.id === "welcome");
    expect(welcome?.facts).toEqual(["Wi-Fi", "Оплата картой"]);
    expect(welcome?.pending).toEqual(["чай и кофе"]);
    expect(VISIT_STEPS.find((s) => s.id === "tools")?.pending).toEqual(["крафт-пакет"]);
    expect(MASTERS.map((m) => m.name)).toEqual(["Алевтина", "Диана", "Елизавета"]);
    expect(MASTERS.every((m) => m.photo === null)).toBe(true);
    expect(WORKS).toHaveLength(10);
    expect(WORKS.every((w) => !w.stub)).toBe(true);
  });
});
