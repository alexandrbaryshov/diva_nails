// «Записаться» — раскрывающийся выбор: Telegram с готовым текстом или онлайн-запись.
// Не модальное окно: панель под шапкой, закрывается Esc, крестиком и нажатием мимо.
import { signal, type ReadonlySignal } from "@preact/signals";
import type { JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { goal } from "../analytics";
import { Pending } from "../components/Pending";
import { STUDIO } from "../data/studio";
import type { Design } from "../state/design";
import { designUrl } from "../state/link";
import { IconClose } from "../constructor/tools/icons";
import { startTelegram, telegramText, telegramUrl } from "./telegram";
import "./booking.css";

export const BOOKING_SHEET_ID = "booking-sheet";
export const TELEGRAM_COPIED = "Текст скопирован — вставь в чат, если не подставился";
export const YCLIENTS_SOON = "Онлайн-запись скоро появится — напиши нам в Telegram";

export interface BookingSheetProps {
  open: boolean;
  onClose(): void;
  /** дизайн для текста в Telegram; без него — просто «Привет! Хочу записаться.» */
  design?: Design;
}

export function BookingSheet({ open, onClose, design }: BookingSheetProps): JSX.Element {
  const [status, setStatus] = useState<string | null>(null);
  const [manualText, setManualText] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setStatus(null);
      setManualText(false);
      return;
    }
    root.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return <></>;

  const text = telegramText(design ?? null, design ? designUrl(design) : "");
  const yclients = STUDIO.yclientsUrl;

  return (
    <div class="bk" id={BOOKING_SHEET_ID} role="dialog" aria-label="Записаться" ref={root}>
      <div class="bk-head">
        <p class="bk-title">Как тебе удобнее?</p>
        <button type="button" class="bk-close" aria-label="Закрыть" onClick={onClose}>
          <IconClose />
        </button>
      </div>
      <a
        class="bk-option bk-option--main"
        href={telegramUrl(text)}
        target="_blank"
        rel="noopener"
        onClick={() => {
          void startTelegram(text).then((ok) => {
            setManualText(!ok);
            setStatus(ok ? TELEGRAM_COPIED : "Не удалось скопировать — выдели текст ниже и вставь в чат");
          });
        }}
      >
        <span class="bk-option-name">Написать в Telegram</span>
        <span class="bk-option-note">{design ? "Текст с твоим дизайном уже готов" : "Ответим и подберём время"}</span>
      </a>
      {yclients ? (
        <a class="bk-option" href={yclients} target="_blank" rel="noopener" onClick={() => goal("book_yclients")}>
          <span class="bk-option-name">Выбрать время онлайн</span>
          <span class="bk-option-note">Онлайн-запись</span>
        </a>
      ) : (
        <button
          type="button"
          class="bk-option"
          onClick={() => {
            goal("book_yclients");
            setStatus(YCLIENTS_SOON);
          }}
        >
          <span class="bk-option-name">
            Выбрать время онлайн <span class="bk-sep">·</span> <Pending />
          </span>
        </button>
      )}
      {manualText && <textarea class="bk-text" readOnly rows={4} value={text} aria-label="Текст для Telegram" onFocus={(e) => e.currentTarget.select()} />}
      <p class="bk-status" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}

// ── открыть выбор записи откуда угодно ─────────────────────────────────────────

interface BookingState {
  open: boolean;
  design?: Design;
}

const state = signal<BookingState>({ open: false });
let returnFocus: HTMLElement | null = null;

/** Открыть выбор записи откуда угодно (шапка, услуги, карточка, «Хочу так же»). */
export const booking: {
  open(design?: Design): void;
  close(): void;
  toggle(design?: Design): void;
  readonly state: ReadonlySignal<BookingState>;
} = {
  open(design) {
    returnFocus = typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null;
    state.value = { open: true, design };
  },
  close() {
    if (!state.value.open) return;
    state.value = { open: false };
    returnFocus?.focus?.();
    returnFocus = null;
  },
  toggle(design) {
    if (state.value.open) booking.close();
    else booking.open(design);
  },
  state,
};

/** Единственная панель записи на странице. Ставится в App один раз. */
export function BookingHost() {
  const s = state.value;
  useEffect(() => {
    if (!s.open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (t?.closest?.(`#${BOOKING_SHEET_ID}, [aria-controls="${BOOKING_SHEET_ID}"]`)) return;
      booking.close();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [s.open]);
  return <BookingSheet open={s.open} design={s.design} onClose={() => booking.close()} />;
}
