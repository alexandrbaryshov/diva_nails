// Контакты: адрес, карта Яндекса (грузится при подходе к блоку), часы / второй телефон / вход — «уточняется», кнопки связи.
import { useEffect, useRef, useState } from "preact/hooks";
import { booking } from "../booking";
import { Maybe } from "../components/Pending";
import { STUDIO } from "../data/studio";
import { store } from "../state/store";

const MAP_QUERY = `Diva Nails, ${STUDIO.city}, ${STUDIO.address}`;
const MAP_SRC = `https://yandex.ru/map-widget/v1/?text=${encodeURIComponent(MAP_QUERY)}&z=16`;
const MAP_TIMEOUT_MS = 10000;

type MapState = "idle" | "loading" | "ready" | "failed";

function AddressCard({ failed }: { failed?: boolean }) {
  return (
    <div class="map-card" data-map-fallback={failed ? "" : undefined}>
      <p class="map-card-title">{STUDIO.address}</p>
      <p class="map-card-city">{STUDIO.city}</p>
      {failed && <p class="map-card-note">Карта не загрузилась, но адрес на месте.</p>}
      <a class="btn btn-line" href={STUDIO.rating.url} target="_blank" rel="noopener noreferrer">
        Открыть в Яндекс Картах
      </a>
    </div>
  );
}

function MapBlock({ timeoutMs }: { timeoutMs: number }) {
  const [state, setState] = useState<MapState>("idle");
  const box = useRef<HTMLDivElement>(null);

  // карта грузится, когда блок почти на экране
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      setState("loading");
      return;
    }
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setState((s) => (s === "idle" ? "loading" : s));
          io.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (state !== "loading") return;
    const t = setTimeout(() => setState((s) => (s === "loading" ? "failed" : s)), timeoutMs);
    return () => clearTimeout(t);
  }, [state, timeoutMs]);

  return (
    <div class="map" ref={box}>
      {(state === "idle" || state === "failed") && <AddressCard failed={state === "failed"} />}
      {(state === "loading" || state === "ready") && (
        <iframe
          class="map-frame"
          title={`Карта: ${STUDIO.name}, ${STUDIO.address}`}
          src={MAP_SRC}
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
          onLoad={() => setState("ready")}
        />
      )}
    </div>
  );
}

export function Contacts({ mapTimeoutMs = MAP_TIMEOUT_MS }: { mapTimeoutMs?: number }) {
  return (
    <section class="sec" id="contacts" aria-labelledby="contacts-title">
      <h2 id="contacts-title">Контакты</h2>
      <div class="contacts-grid">
        <div class="contacts-info">
          <dl class="facts">
            <div>
              <dt>Адрес</dt>
              <dd>
                {STUDIO.city}, {STUDIO.address}
              </dd>
            </div>
            <div>
              <dt>Как найти вход</dt>
              <dd>
                <Maybe value={STUDIO.entrance}>{(e) => e}</Maybe>
              </dd>
            </div>
            <div>
              <dt>Часы работы</dt>
              <dd>
                <Maybe value={STUDIO.hours}>{(h) => h}</Maybe>
              </dd>
            </div>
            <div>
              <dt>Телефон</dt>
              <dd>
                <a href={STUDIO.phone.href}>{STUDIO.phone.display}</a>
              </dd>
            </div>
            <div>
              <dt>Второй телефон</dt>
              <dd>
                <Maybe value={STUDIO.phone2}>{(p) => <a href={p.href}>{p.display}</a>}</Maybe>
              </dd>
            </div>
          </dl>
          <ul class="contact-buttons">
            <li>
              <a class="btn btn-main" href={STUDIO.telegram.url} target="_blank" rel="noopener">
                Telegram
              </a>
            </li>
            <li>
              <button type="button" class="btn btn-line" onClick={() => booking.open(store.design.value)}>
                Онлайн-запись
              </button>
            </li>
            <li>
              <a class="btn btn-line" href={STUDIO.whatsapp} target="_blank" rel="noopener">
                WhatsApp
              </a>
            </li>
            <li>
              <a class="btn btn-line" href={STUDIO.phone.href}>
                Позвонить
              </a>
            </li>
            <li>
              <a class="btn btn-line" href={STUDIO.vk} target="_blank" rel="noopener">
                ВКонтакте
              </a>
            </li>
          </ul>
          <p class="amenities">
            {STUDIO.amenities.includes("card") && "Оплата картой"}
            {STUDIO.amenities.length > 1 && ", "}
            {STUDIO.amenities.includes("wifi") && "Wi-Fi"}
          </p>
        </div>
        <MapBlock timeoutMs={mapTimeoutMs} />
      </div>
    </section>
  );
}
