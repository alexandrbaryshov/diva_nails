// Лист после «Сохранить»: карточка и четыре действия — в галерею, в Telegram, записаться онлайн, скопировать ссылку.
import { render } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { goal } from "../analytics";
import { TELEGRAM_COPIED, YCLIENTS_SOON, copyText, startTelegram, telegramText, telegramUrl } from "../booking";
import { Pending } from "../components/Pending";
import { STUDIO } from "../data/studio";
import { IconClose } from "../constructor/tools/icons";
import type { Design } from "../state/design";
import { cardFilename, saveCard } from "./save";
import "./card.css";

export const BUILD_ERROR = "Не получилось собрать карточку — попробуй ещё раз";
export const LINK_COPIED = "Ссылка скопирована — отправь подруге";
export const IMAGE_NOT_IN_LINK = "Картинка по ссылке не передаётся — она есть на карточке";
export const SAVED_DOWNLOAD = "Карточка сохранена — смотри в загрузках";
export const SAVED_SHARED = "Готово — карточка у тебя";
export const HOLD_TO_SAVE = "Зажми и сохрани";

export interface SaveSheetProps {
  /** собранная карточка; null — сборка не удалась */
  blob: Blob | null;
  design: Design;
  url: string;
  /** в дизайне есть принт или референс — по ссылке они не уйдут */
  hasImages: boolean;
  onClose(): void;
  onRetry(): void;
}

export function SaveSheet({ blob, design, url, hasImages, onClose, onRetry }: SaveSheetProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  const [manualLink, setManualLink] = useState(false);
  const [manualText, setManualText] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const linkField = useRef<HTMLInputElement>(null);
  const src = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => (src ? URL.revokeObjectURL(src) : undefined), [src]);

  useEffect(() => {
    root.current?.querySelector<HTMLElement>("button, a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (full) setFull(false);
      else onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [full]);

  useEffect(() => {
    if (manualLink) linkField.current?.select();
  }, [manualLink]);

  const note = (text: string) => (hasImages ? `${text}. ${IMAGE_NOT_IN_LINK}` : text);
  const tgText = telegramText(design, url);
  const yclients = STUDIO.yclientsUrl;

  const onGallery = async () => {
    if (!blob) return;
    try {
      const r = await saveCard(blob, cardFilename());
      if (r === "shared") setStatus(SAVED_SHARED);
      else if (r === "downloaded") setStatus(SAVED_DOWNLOAD);
      else if (r === "fallback") setFull(true);
      // cancelled — карточка остаётся открытой, ничего не говорим
    } catch {
      setFull(true);
    }
  };

  const onCopy = async () => {
    const ok = await copyText(url);
    if (ok) {
      setManualLink(false);
      setStatus(note(LINK_COPIED));
    } else {
      setManualLink(true);
      setStatus(hasImages ? IMAGE_NOT_IN_LINK : null);
    }
  };

  if (!blob || !src) {
    return (
      <div class="sv" role="dialog" aria-modal="true" aria-label="Карточка-бриф" ref={root}>
        <div class="sv-panel">
          <p class="sv-title">Не вышло</p>
          <p class="sv-status" role="alert">
            {BUILD_ERROR}
          </p>
          <button type="button" class="sv-btn sv-btn--main" onClick={onRetry}>
            Попробовать ещё раз
          </button>
          <button type="button" class="sv-btn" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    );
  }

  return (
    <div class="sv" role="dialog" aria-modal="true" aria-label="Карточка-бриф" ref={root}>
      <div class="sv-panel">
        <div class="sv-head">
          <p class="sv-title">Карточка готова</p>
          <button type="button" class="sv-close" aria-label="Закрыть" onClick={onClose}>
            <IconClose />
          </button>
        </div>
        <img class="sv-card" src={src} alt="Карточка-бриф с твоим дизайном" width={1080} height={1920} />
        <div class="sv-actions">
          <button type="button" class="sv-btn sv-btn--main" onClick={onGallery}>
            В галерею
          </button>
          <a
            class="sv-btn"
            href={telegramUrl(tgText)}
            target="_blank"
            rel="noopener"
            onClick={() => {
              void startTelegram(tgText).then((ok) => {
                setManualText(!ok);
                setStatus(note(ok ? TELEGRAM_COPIED : "Не удалось скопировать — выдели текст ниже и вставь в чат"));
              });
            }}
          >
            В Telegram
          </a>
          {yclients ? (
            <a class="sv-btn" href={yclients} target="_blank" rel="noopener" onClick={() => goal("book_yclients")}>
              Записаться онлайн
            </a>
          ) : (
            <button
              type="button"
              class="sv-btn"
              onClick={() => {
                goal("book_yclients");
                setStatus(YCLIENTS_SOON);
              }}
            >
              Записаться онлайн <span class="sv-sep">·</span> <Pending />
            </button>
          )}
          <button type="button" class="sv-btn" onClick={onCopy}>
            Скопировать ссылку
          </button>
        </div>
        {manualText && <textarea class="sv-link" readOnly rows={4} value={tgText} aria-label="Текст для Telegram" onFocus={(e) => e.currentTarget.select()} />}
        {manualLink && (
          <input class="sv-link" ref={linkField} readOnly value={url} aria-label="Ссылка на дизайн" onFocus={(e) => e.currentTarget.select()} />
        )}
        <p class="sv-status" role="status" aria-live="polite">
          {status}
        </p>
      </div>
      {full && (
        <div class="sv-full" role="dialog" aria-modal="true" aria-label="Карточка на весь экран">
          <img src={src} alt="Карточка-бриф" />
          <p class="sv-hold">{HOLD_TO_SAVE}</p>
          <button type="button" class="sv-btn sv-btn--main" onClick={() => setFull(false)}>
            Готово
          </button>
        </div>
      )}
    </div>
  );
}

// ── показать лист поверх страницы ───────────────────────────────────────────────

let host: HTMLDivElement | null = null;
let returnFocus: HTMLElement | null = null;

export function hideSaveSheet(): void {
  if (host) {
    render(null, host);
    host.remove();
    host = null;
  }
  returnFocus?.focus?.();
  returnFocus = null;
}

export function showSaveSheet(props: Omit<SaveSheetProps, "onClose">): void {
  if (!host) {
    returnFocus = document.activeElement as HTMLElement | null;
    host = document.createElement("div");
    host.id = "save-sheet-host";
    document.body.appendChild(host);
  }
  render(<SaveSheet {...props} onClose={hideSaveSheet} />, host);
}
