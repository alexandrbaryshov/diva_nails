import studio from "../../data/studio.json";

export type Amenity = "card" | "wifi";

export interface Contact {
  display: string;
  href: string;
}

/**
 * Факты студии — только из facts.md. Неизвестное — null, на странице рисуется <Pending>.
 * Поля, которые пока null, типизированы как «значение | null»: когда студия пришлёт факт,
 * правится одна строка в data/studio.json, а не код.
 */
export interface Studio {
  name: "Diva Nails";
  /** «ногтевая студия, салон красоты» */
  kind: string;
  city: "Чебоксары";
  address: string;
  phone: Contact;
  phone2: Contact | null;
  telegram: { username: "divanail21"; url: string };
  whatsapp: string;
  vk: string;
  /** url — Яндекс Карты (поиск по названию и адресу) */
  rating: { value: number; count: number; url: string };
  amenities: Amenity[];
  legal: { form: "ИП"; inn: string; ogrnip: string; fullName: string | null };
  hours: string | null;
  entrance: string | null;
  since: number | null;
  yclientsUrl: string | null;
  metrikaId: number | null;
  logo: string | null;
  siteUrl: "https://alexandrbaryshov.github.io/diva-nails/";
}

export const STUDIO: Studio = studio as unknown as Studio;

/** Адрес сайта на GitHub Pages; base сборки — /diva-nails/. */
export const SITE_URL: Studio["siteUrl"] = STUDIO.siteUrl;
