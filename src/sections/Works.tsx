// «Работы»: лента со свайпом на телефоне, плитка на компьютере; тап — просмотр на весь экран, «Хочу так же» — запись.
import { useEffect, useRef, useState } from "preact/hooks";
import { booking } from "../booking";
import { WORKS } from "../data/works";
import { store } from "../state/store";
import { Photo, StubChip } from "./Photo";

const SWIPE_PX = 48;

function Viewer({ index, onIndex, onClose }: { index: number; onIndex(i: number): void; onClose(): void }) {
  const root = useRef<HTMLDivElement>(null);
  const start = useRef<number | null>(null);
  const total = WORKS.length;
  const work = WORKS[index];
  const step = (d: number) => onIndex((index + d + total) % total);

  useEffect(() => {
    root.current?.querySelector<HTMLElement>(".viewer-close")?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "Tab") {
        // фокус не уходит за просмотр
        const items = [...(root.current?.querySelectorAll<HTMLElement>("button") ?? [])];
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  return (
    <div
      class="viewer"
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр работы"
      ref={root}
      onPointerDown={(e) => {
        start.current = e.clientX;
      }}
      onPointerUp={(e) => {
        if (start.current === null) return;
        const dx = e.clientX - start.current;
        start.current = null;
        if (Math.abs(dx) > SWIPE_PX) step(dx < 0 ? 1 : -1);
      }}
      onPointerCancel={() => {
        start.current = null;
      }}
    >
      <div class="viewer-bar">
        <span class="viewer-count" aria-live="polite">{`${index + 1} из ${total}`}</span>
        <button type="button" class="viewer-btn viewer-close" aria-label="Закрыть просмотр" onClick={onClose}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <figure class="viewer-figure">
        <div class="viewer-frame">
          <Photo name={work.media} alt={work.alt} sizes="100vw" class="viewer-photo" eager />
          {work.stub && <StubChip />}
        </div>
      </figure>
      <button type="button" class="viewer-btn viewer-prev" aria-label="Предыдущая работа" onClick={() => step(-1)}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M14.5 5.5L8 12l6.5 6.5" />
        </svg>
      </button>
      <button type="button" class="viewer-btn viewer-next" aria-label="Следующая работа" onClick={() => step(1)}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M9.5 5.5L16 12l-6.5 6.5" />
        </svg>
      </button>
      <div class="viewer-foot">
        <button type="button" class="btn btn-main" onClick={() => { onClose(); booking.open(store.design.value); }}>
          Хочу так же
        </button>
      </div>
    </div>
  );
}

export function Works() {
  const [open, setOpen] = useState<number | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  const close = () => {
    setOpen(null);
    const el = opener.current;
    opener.current = null;
    // фокус возвращается на плитку, с которой открыли
    el?.focus();
  };

  return (
    <section class="sec" id="works" aria-labelledby="works-title">
      <h2 id="works-title">Работы</h2>
      <p class="sec-lead">Маникюр и педикюр наших мастеров. Откройте фото, чтобы рассмотреть детали.</p>
      <ul class="works-list">
        {WORKS.map((w, i) => (
          <li key={w.id} class="work" data-work={w.id}>
            <button
              type="button"
              class="work-open"
              aria-label={`Открыть фото ${i + 1} из ${WORKS.length}: ${w.alt}`}
              onClick={(e) => {
                opener.current = e.currentTarget;
                setOpen(i);
              }}
            >
              <Photo name={w.media} alt="" />
              {w.stub && <StubChip />}
            </button>
            <button type="button" class="btn btn-soft work-want" onClick={() => booking.open(store.design.value)}>
              Хочу так же
            </button>
          </li>
        ))}
      </ul>
      {open !== null && <Viewer index={open} onIndex={setOpen} onClose={close} />}
    </section>
  );
}
