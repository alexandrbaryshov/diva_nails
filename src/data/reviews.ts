import reviews from "../../data/reviews.json";

export interface Review {
  id: string;
  /** quote — дословная цитата, в кавычках; retelling — пересказ, без кавычек («о чём пишут») */
  kind: "quote" | "retelling";
  text: string;
  author: string;
  /** о каком мастере отзыв; null — не назван */
  master: string | null;
}

export const REVIEWS: readonly Review[] = reviews.items as unknown as readonly Review[];
