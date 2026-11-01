// «Услуги и цены»: пять категорий строками прайса. Цены и время — «уточняется», пока студия не пришлёт прайс.
import { booking } from "../booking";
import { Maybe, Pending } from "../components/Pending";
import { SERVICES, type ServiceCategory } from "../data/services";
import { store } from "../state/store";
import { openConstructor } from "./actions";

function Items({ category }: { category: ServiceCategory }) {
  if (!category.items || category.items.length === 0) {
    return (
      <p class="price-meta">
        Цена и длительность — <Pending />
      </p>
    );
  }
  return (
    <ul class="price-items">
      {category.items.map((item) => (
        <li key={item.title}>
          <span>{item.title}</span>
          <span>
            <Maybe value={item.price}>{(p) => p}</Maybe> · <Maybe value={item.duration}>{(d) => d}</Maybe>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Prices() {
  return (
    <section class="sec" id="prices" aria-labelledby="prices-title">
      <h2 id="prices-title">Услуги и цены</h2>
      <p class="sec-lead">Выберите раздел, чтобы увидеть услуги и цены. Прайс из YCLIENTS на 1 ноября 2026; актуальная стоимость — при записи.</p>
      <ul class="price-list">
        {SERVICES.map((c) => (
          <li key={c.id} class="price-row" data-category={c.id}>
            <details class="price-main">
              <summary>{c.title}</summary>
              <Items category={c} />
            <div class="price-actions">
              {c.constructorHand && (
                <button type="button" class="btn btn-line" onClick={() => openConstructor(c.constructorHand!)}>
                  Нарисовать в конструкторе
                </button>
              )}
              <button type="button" class="btn btn-main" onClick={() => booking.open(store.design.value)}>
                Записаться
              </button>
            </div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}