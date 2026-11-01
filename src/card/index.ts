// «Сохранить»: лампа → карточка-бриф → лист с действиями. Тяжёлое (QR, шрифты, лист) грузится только по нажатию.
import { goal } from "../analytics";
import { lampSequence } from "../motion";
import { designUrl } from "../state/link";
import { store } from "../state/store";

let busy = false;

export const saveFlow: { open(): void } = {
  open() {
    if (busy) return;
    busy = true;
    const design = store.design.value;
    const prints = store.prints.value;
    const reference = store.reference.value;
    const url = designUrl(design);
    const stage = document.querySelector<HTMLElement>(".dn-stage") ?? document.body;

    const sheet = import("./SaveSheet");
    const built = import("./build").then((m) => m.buildCard({ design, prints, reference, createdAt: new Date(), url }));
    // ошибки обрабатываем ниже, не как «необработанные»
    built.catch(() => undefined);
    sheet.catch(() => undefined);

    void lampSequence(stage, built).then(async () => {
      const common = { design, url, hasImages: prints.length > 0 || reference !== null, onRetry: () => saveFlow.open() };
      try {
        const { showSaveSheet } = await sheet;
        let blob: Blob | null = null;
        try {
          blob = await built;
          goal("card_save");
        } catch {
          // карточка не собралась: лист скажет об этом, дизайн цел
        }
        busy = false;
        showSaveSheet({ ...common, blob });
      } catch {
        busy = false; // не загрузился сам лист (нет сети) — можно нажать ещё раз
      }
    });
  },
};
