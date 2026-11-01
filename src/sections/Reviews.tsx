// Отзывы: бейдж с рейтингом Яндекс Карт и отобранные отзывы. Цитата — в кавычках, пересказ — без. Живого виджета нет.
import { REVIEWS, type Review } from "../data/reviews";
import { STUDIO } from "../data/studio";

/** 1 отзыв · 2–4 отзыва · 5–20 отзывов */
export function reviewsWord(n: number): string {
  const last2 = n % 100;
  const last = n % 10;
  if (last2 >= 11 && last2 <= 14) return "отзывов";
  if (last === 1) return "отзыв";
  if (last >= 2 && last <= 4) return "отзыва";
  return "отзывов";
}

function ReviewCard({ r }: { r: Review }) {
  if (r.kind === "quote") {
    return (
      <li class="review review--quote" data-review={r.id} data-kind="quote">
        <blockquote>
          <p>«{r.text}»</p>
        </blockquote>
        <p class="review-by">{r.author}</p>
      </li>
    );
  }
  return (
    <li class="review review--retelling" data-review={r.id} data-kind="retelling">
      <p class="review-label">О чём пишут:</p>
      <p class="review-text">{r.text}</p>
      <p class="review-by">
        {r.author}
        {r.master && <>, мастер {r.master}</>}
      </p>
    </li>
  );
}

export function Reviews() {
  const { rating } = STUDIO;
  return (
    <section class="sec" id="reviews" aria-labelledby="reviews-title">
      <h2 id="reviews-title">Что говорят о нас</h2>
      <a class="rating-badge" href={rating.url} target="_blank" rel="noopener noreferrer">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 3.6l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" />
        </svg>
        <span>{`${rating.value.toFixed(1)} · ${rating.count} ${reviewsWord(rating.count)} на Яндекс Картах`}</span>
      </a>
      <ul class="reviews-grid">
        {REVIEWS.map((r) => (
          <ReviewCard key={r.id} r={r} />
        ))}
      </ul>
    </section>
  );
}