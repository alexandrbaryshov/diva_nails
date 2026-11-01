// Шапка: надпись «Diva Nails» (пока нет логотипа), меню-якоря на компьютере, «Записаться».
import { BOOKING_SHEET_ID, booking } from "../booking/BookingSheet";
import { STUDIO } from "../data/studio";
import { store } from "../state/store";
import "./Header.css";

/** Разделы страницы для меню-якорей. id — якоря секций (таск 06 ставит их на свои <section id>). */
export const NAV_SECTIONS: readonly { id: string; label: string }[] = [
  { id: "works", label: "Работы" },
  { id: "prices", label: "Цены" },
  { id: "for-him", label: "Для него" },
  { id: "visit", label: "Визит" },
  { id: "reviews", label: "Отзывы" },
  { id: "contacts", label: "Контакты" },
];

export function Header() {
  const open = booking.state.value.open;
  return (
    <header class="site-header">
      <div class="site-header-inner">
        <a class="brand" href="#constructor">
          {STUDIO.name}
        </a>
        <nav class="site-nav" aria-label="Разделы">
          {NAV_SECTIONS.map((s) => (
            <a key={s.id} class="site-nav-link" href={`#${s.id}`}>
              {s.label}
            </a>
          ))}
        </nav>
        <button
          type="button"
          class="book-btn"
          aria-expanded={open}
          aria-controls={BOOKING_SHEET_ID}
          onClick={() => booking.toggle(store.design.value)}
        >
          <span class="book-pill">Записаться</span>
        </button>
      </div>
    </header>
  );
}
