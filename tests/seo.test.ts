import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { STUDIO, SITE_URL } from "../src/data/studio";
import { jsonLdScript, nailSalonJsonLd } from "../src/seo/schema";

// Ожидаемое — из facts.md (адрес, телефон, рейтинг 5.0 / 162), а не из кода под тестом.
const html = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const meta = (doc: string, attr: "property" | "name", key: string) =>
  new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`).exec(doc)?.[1];
const png = (path: string) => {
  const b = readFileSync(join(process.cwd(), path));
  return { sig: [...b.subarray(0, 8)].join(","), w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
};

describe("JSON-LD NailSalon", () => {
  const ld = nailSalonJsonLd(STUDIO, SITE_URL) as Record<string, unknown>;

  it("тип, имя, адрес и телефон — из фактов студии", () => {
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("NailSalon");
    expect(ld.name).toBe("Diva Nails");
    expect(ld.telephone).toBe("+79527590659");
    expect(ld.address).toEqual({
      "@type": "PostalAddress",
      streetAddress: "проспект Ленина, 7, корп. 1",
      addressLocality: "Чебоксары",
      addressCountry: "RU",
    });
    expect(ld.url).toBe("https://alexandrbaryshov.github.io/diva_nails/");
  });

  it("рейтинг 5.0 по 162 отзывам; часов и цен нет, пока студия их не прислала", () => {
    expect(ld.aggregateRating).toEqual({ "@type": "AggregateRating", ratingValue: "5.0", reviewCount: 162, bestRating: "5" });
    expect(ld).not.toHaveProperty("openingHours");
    expect(ld).not.toHaveProperty("openingHoursSpecification");
    expect(ld).not.toHaveProperty("priceRange");
  });

  it("картинка и соцсети — абсолютные ссылки", () => {
    expect(ld.image).toBe("https://alexandrbaryshov.github.io/diva_nails/og/main.png");
    expect(ld.sameAs).toEqual(["https://t.me/divanail21", "https://vk.ru/diva_nail21"]);
  });

  it("в скрипте нет «</», который закрыл бы тег, и JSON читается обратно", () => {
    const tricky = { ...(ld as object), name: "</script><b>" };
    const text = jsonLdScript(tricky);
    expect(text).not.toContain("</");
    expect(JSON.parse(text).name).toBe("</script><b>");
  });
});

describe("заголовок страниц и ссылки", () => {
  const home = html("index.html");
  const design = html("d/index.html");

  it("главная: title из брифа, description, canonical, OG и Twitter — абсолютные от SITE_URL", () => {
    expect(home).toContain("<title>Маникюр и педикюр в Чебоксарах — Diva Nails, пр. Ленина, 7</title>");
    expect(meta(home, "name", "description")).toMatch(/Diva Nails/);
    expect(home).toContain(`<link rel="canonical" href="${SITE_URL}" />`);
    expect(meta(home, "property", "og:url")).toBe(SITE_URL);
    expect(meta(home, "property", "og:image")).toBe(`${SITE_URL}og/main.png`);
    expect(meta(home, "name", "twitter:image")).toBe(`${SITE_URL}og/main.png`);
    expect(meta(home, "property", "og:image:width")).toBe("1200");
    expect(meta(home, "property", "og:image:height")).toBe("630");
    expect(meta(home, "property", "og:title")).toBe("Маникюр и педикюр в Чебоксарах — Diva Nails, пр. Ленина, 7");
    expect(meta(home, "name", "twitter:card")).toBe("summary_large_image");
  });

  it("ссылка на дизайн: свои OG-теги «Посмотри мой дизайн» и своя картинка", () => {
    expect(meta(design, "property", "og:title")).toBe("Посмотри мой дизайн маникюра — Diva Nails");
    expect(meta(design, "property", "og:url")).toBe(`${SITE_URL}d/`);
    expect(meta(design, "property", "og:image")).toBe(`${SITE_URL}og/design.png`);
    expect(design).toContain(`<link rel="canonical" href="${SITE_URL}d/" />`);
  });

  it("OG-картинки лежат в public/og и размером 1200×630", () => {
    for (const name of ["main", "design"]) {
      const p = png(`public/og/${name}.png`);
      expect(p.sig).toBe("137,80,78,71,13,10,26,10");
      expect([p.w, p.h]).toEqual([1200, 630]);
    }
  });
});
