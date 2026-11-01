import type { ComponentChildren } from "preact";

/** Слово-пометка для места, факт для которого студия ещё не прислала. */
export const PENDING_TEXT = "уточняется";

export interface PendingProps {
  /** продолжение после тире: «спроси нас в Telegram» */
  hint?: string;
  class?: string;
}

/** «уточняется» — на месте неизвестного факта (null в data/). */
export function Pending({ hint, class: className }: PendingProps) {
  const text = hint ? `${PENDING_TEXT} — ${hint}` : PENDING_TEXT;
  return <span class={className ? `pending ${className}` : "pending"}>{text}</span>;
}

export interface MaybeProps<T> {
  value: T | null | undefined;
  children: (value: T) => ComponentChildren;
  hint?: string;
}

/** Факт есть — рисует его, нет (null) — «уточняется». */
export function Maybe<T>({ value, children, hint }: MaybeProps<T>) {
  return value === null || value === undefined ? <Pending hint={hint} /> : <>{children(value)}</>;
}
