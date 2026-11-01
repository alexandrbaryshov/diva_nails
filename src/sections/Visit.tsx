// «Как проходит визит»: шесть шагов с фото. Мастера появляются здесь, по именам из отзывов; отдельного блока нет.
import { Pending } from "../components/Pending";
import { MASTERS, VISIT_STEPS, type VisitStep } from "../data/visit";
import { Photo, StubChip } from "./Photo";

const STEP_TEXT: Record<VisitStep["id"], string> = {
  booking: "Пишешь нам в Telegram или звонишь — и можно сразу прислать карточку со своим дизайном.",
  welcome: "Заходишь, устраиваешься поудобнее — и мы начинаем.",
  brief: "Показываешь сохранённую карточку, мы смотрим, что получится, и обсуждаем длину, форму и цвет.",
  tools: "Перед работой мастер готовит инструменты.",
  work: "Мастер делает маникюр по твоей карточке. Хочется что-то поправить — скажи ему по ходу.",
  care: "В конце мастер подскажет, как ухаживать за руками, чтобы покрытие радовало дольше.",
};

const PENDING_LABEL: Record<string, string> = {
  "чай и кофе": "Чай и кофе",
  "крафт-пакет": "Инструменты из крафт-пакета",
};

const label = (p: string) => PENDING_LABEL[p] ?? p.charAt(0).toUpperCase() + p.slice(1);

export function Visit() {
  return (
    <section class="sec" id="visit" aria-labelledby="visit-title">
      <h2 id="visit-title">Как проходит визит</h2>
      <p class="sec-lead">Шесть шагов от записи до ухода за руками. Фото пока временные.</p>
      <ol class="visit-list">
        {VISIT_STEPS.map((s) => (
          <li key={s.id} class="visit-step" data-step={s.id}>
            <div class="visit-photo">
              {s.media && <Photo name={s.media} alt="" sizes="(min-width: 900px) 30vw, 88vw" />}
              <StubChip />
            </div>
            <h3>{s.title}</h3>
            <p>{STEP_TEXT[s.id]}</p>
            {s.facts.length > 0 && (
              <ul class="visit-facts">
                {s.facts.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            )}
            {s.pending.map((p) => (
              <p key={p} class="visit-pending">
                {label(p)}: <Pending />
              </p>
            ))}
          </li>
        ))}
      </ol>
      <div class="masters">
        <p class="masters-lead">Мастера, о которых пишут в отзывах:</p>
        <ul class="masters-list">
          {MASTERS.map((m) => (
            <li key={m.name}>
              <strong>{m.name}</strong>
              {m.about && <> — {m.about}</>}
            </li>
          ))}
        </ul>
        <p class="masters-photos">
          Фото мастеров: <Pending />
        </p>
      </div>
    </section>
  );
}