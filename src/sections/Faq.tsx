// Вопросы аккордеоном: ответы — только известные факты, остальное «уточняется — спроси нас в Telegram».
import { useState } from "preact/hooks";
import { Pending } from "../components/Pending";
import { FAQ, type FaqItem } from "../data/faq";
import { STUDIO } from "../data/studio";

function Answer({ item }: { item: FaqItem }) {
  if (item.a === null) return <Pending hint="спроси нас в Telegram" />;
  return (
    <>
      {item.a}
      {item.pending && (
        <>
          {" "}
          Ещё: {item.pending} — <Pending />
        </>
      )}
    </>
  );
}

export function Faq() {
  const [open, setOpen] = useState<string[]>([]);
  const toggle = (id: string) => setOpen((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));

  const onKey = (e: KeyboardEvent) => {
    const list = [...(e.currentTarget as HTMLElement).closest(".faq")!.querySelectorAll<HTMLButtonElement>(".faq-q")];
    const at = list.indexOf(e.currentTarget as HTMLButtonElement);
    let to = -1;
    if (e.key === "ArrowDown") to = (at + 1) % list.length;
    else if (e.key === "ArrowUp") to = (at - 1 + list.length) % list.length;
    else if (e.key === "Home") to = 0;
    else if (e.key === "End") to = list.length - 1;
    if (to >= 0) {
      e.preventDefault();
      list[to].focus();
    }
  };

  return (
    <section class="sec" id="faq" aria-labelledby="faq-title">
      <h2 id="faq-title">Вопросы</h2>
      <div class="faq">
        {FAQ.map((item) => {
          const isOpen = open.includes(item.id);
          return (
            <div key={item.id} class="faq-item">
              <h3>
                <button
                  type="button"
                  class="faq-q"
                  id={`faq-q-${item.id}`}
                  aria-expanded={isOpen}
                  aria-controls={`faq-a-${item.id}`}
                  onClick={() => toggle(item.id)}
                  onKeyDown={onKey}
                >
                  {item.q}
                  <svg class="faq-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M6 9.5l6 6 6-6" />
                  </svg>
                </button>
              </h3>
              <div class="faq-a" id={`faq-a-${item.id}`} role="region" aria-labelledby={`faq-q-${item.id}`} hidden={!isOpen}>
                <p>
                  <Answer item={item} />
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <p class="faq-more">
        Остались вопросы? <a href={STUDIO.telegram.url} target="_blank" rel="noopener">Напиши нам в Telegram</a>
      </p>
    </section>
  );
}