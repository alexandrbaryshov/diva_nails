import { useEffect } from "preact/hooks";
import { BookingHost } from "./booking/BookingSheet";
import { Constructor } from "./constructor/Constructor";
import { mountTiltButton } from "./motion/TiltButton";
import { JsonLd } from "./seo/JsonLd";
import { Header } from "./sections/Header";
import { Footer, Sections } from "./sections";

/**
 * Страница целиком: шапка, конструктор (#constructor), секции под ним, подвал с реквизитами; выбор записи — один на страницу.
 * Метрика подключается в main.tsx (`initAnalytics`) одной строкой конфига — data/studio.json → metrikaId; уведомление о cookies
 * показывает Footer, только когда она включена.
 */
export function App() {
  // «Блик за наклоном» — кнопка на сцене руки (только телефон с датчиком и хромом на ногтях)
  useEffect(() => mountTiltButton(), []);
  return (
    <>
      <Header />
      <main>
        <Constructor />
        <Sections />
      </main>
      <Footer />
      <BookingHost />
      <JsonLd />
    </>
  );
}
