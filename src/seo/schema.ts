// Разметка schema.org для поиска: NailSalon из фактов студии (data/studio.json).
import type { Studio } from "../data/studio";

/**
 * JSON-LD `NailSalon`. Только известное: адрес, телефон, рейтинг. Часов и цен в фактах нет —
 * `openingHours` не пишем, пока студия не пришлёт часы (поле `hours` в data/studio.json).
 */
export function nailSalonJsonLd(studio: Studio, siteUrl: string): Record<string, unknown> {
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "NailSalon",
    "@id": `${siteUrl}#salon`,
    name: studio.name,
    description: "Ногтевая студия и салон красоты в Чебоксарах: маникюр, наращивание, артдизайн, мужской ногтевой сервис, медицинский педикюр.",
    url: siteUrl,
    image: `${siteUrl}og/main.png`,
    telephone: studio.phone.href.replace(/^tel:/, ""),
    address: {
      "@type": "PostalAddress",
      streetAddress: studio.address,
      addressLocality: studio.city,
      addressCountry: "RU",
    },
    sameAs: [studio.telegram.url, studio.vk],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: studio.rating.value.toFixed(1),
      reviewCount: studio.rating.count,
      bestRating: "5",
    },
  };
  // Часы — свободная строка студии; в формат schema.org их переведёт тот, кто их получит.
  return ld;
}

/** Текст для `<script type="application/ld+json">`: «<» экранирован, тег не закрыть изнутри. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
