// «Для него»: «Себе» (мужская рука, подология, быстро) и «Для неё» (подарочный сертификат). Голос спокойнее.
import { Pending } from "../components/Pending";
import { STUDIO } from "../data/studio";
import { openConstructor } from "./actions";

export function ForHim() {
  return (
    <section class="sec" id="for-him" aria-labelledby="for-him-title">
      <h2 id="for-him-title">Для него</h2>
      <div class="him-grid">
        <div class="him-col">
          <h3>Себе</h3>
          <p>
            Ухоженные руки без «салонности»: мужской маникюр без покрытия, подология, всё быстро и по делу. Можно
            сначала посмотреть, как это выглядит на мужской руке.
          </p>
          <button type="button" class="btn btn-line" onClick={() => openConstructor("his")}>
            Открыть мужскую руку в конструкторе
          </button>
        </div>
        <div class="him-col">
          <h3>Для неё</h3>
          <p>
            Хочешь подарить сертификат к 8 Марта, дню рождения или Новому году? Уточни в студии, как его оформить.
          </p>
          <p class="him-note">
            Условия сертификатов: <Pending />
          </p>
          <a class="btn btn-line" href={STUDIO.telegram.url} target="_blank" rel="noopener">
            Узнать в Telegram
          </a>
        </div>
      </div>
    </section>
  );
}