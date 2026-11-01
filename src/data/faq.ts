import faq from "../../data/faq.json";

export interface FaqItem {
  id: string;
  q: string;
  /** известная часть ответа (только факты); null — ответ целиком уточняется */
  a: string | null;
  /** чего ещё не хватает в ответе («наличные»); null — ничего */
  pending: string | null;
}

export const FAQ: readonly FaqItem[] = faq.items as unknown as readonly FaqItem[];
