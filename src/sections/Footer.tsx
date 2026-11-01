// Подвал: реквизиты ИП, ссылка на политику; уведомление о cookies — только когда подключена Метрика.
import { useEffect, useState } from "preact/hooks";
import { analyticsEnabled } from "../analytics";
import { Maybe } from "../components/Pending";
import { STUDIO } from "../data/studio";

const COOKIE_KEY = "dn-cookies-ok";

function privacyHref(): string {
  return `${import.meta.env.BASE_URL}privacy/`;
}

export function CookieNotice({ enabled }: { enabled: boolean }) {
  const [visible, setVisible] = useState(enabled);
  useEffect(() => {
    if (!enabled) return;
    try {
      if (localStorage.getItem(COOKIE_KEY) === "1") setVisible(false);
    } catch {
      /* без хранилища уведомление просто покажется */
    }
  }, [enabled]);
  if (!enabled || !visible) return <></>;
  return (
    <div class="cookie" role="region" aria-label="Cookies">
      <p>
        Сайт использует cookies Яндекс Метрики — так мы понимаем, чем он полезен. Подробнее — в{" "}
        <a href={privacyHref()}>политике конфиденциальности</a>.
      </p>
      <button
        type="button"
        class="btn btn-main"
        onClick={() => {
          setVisible(false);
          try {
            localStorage.setItem(COOKIE_KEY, "1");
          } catch {
            /* не страшно */
          }
        }}
      >
        Понятно
      </button>
    </div>
  );
}

export function Footer() {
  const { legal } = STUDIO;
  return (
    <>
      <footer class="site-footer">
        <p class="footer-name">
          {STUDIO.name} — {STUDIO.kind}, {STUDIO.city}
        </p>
        <p>
          {legal.form} <Maybe value={legal.fullName}>{(name) => name}</Maybe>, ИНН {legal.inn}, ОГРНИП {legal.ogrnip}
        </p>
        <p>
          <a href={privacyHref()}>Политика конфиденциальности</a>
        </p>
      </footer>
      <CookieNotice enabled={analyticsEnabled} />
    </>
  );
}