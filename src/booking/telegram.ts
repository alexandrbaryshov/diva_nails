// Запись через Telegram: текст из дизайна, копия в буфер, переход на t.me/divanail21 с текстом.
// Личка это или канал — неизвестно, поэтому текст и подставляется в ссылку, и лежит в буфере.
import { goal } from "../analytics";
import { shadeById, shadeLabel } from "../data/palette";
import { STUDIO } from "../data/studio";
import type { Design, Nail } from "../state/design";
import { EFFECT_LABEL, LENGTH_LABEL, PATTERN_LABEL, SHAPE_LABEL, nailName } from "../constructor/tools/labels";

/** Что на ногте, одной строкой: «DN 23 · Вишнёвый мокко + хром, френч». Глянец — по умолчанию, не называется. */
export function nailSummary(n: Nail): string {
  const s = n.shade ? shadeById(n.shade) : undefined;
  let text = s ? shadeLabel(s) : "без покрытия";
  // Без оттенка покрытие не отображается; выбранный эффект остаётся в модели.
  const effect = s ? n.effect : "gloss";
  if (effect !== "gloss" && effect !== s?.effect) text += ` + ${EFFECT_LABEL[effect]}`;
  if (n.pattern !== "none") text += `, ${PATTERN_LABEL[n.pattern]}`;
  if (n.decor.length) text += ", декор";
  return text;
}

function joinNames(names: string[]): string {
  return names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} и ${names[names.length - 1]}`;
}

/**
 * Ногти одной строкой: самое частое покрытие — без пояснений, остальное — «безымянный — …».
 * «DN 01 · Молочный, френч; безымянный — DN 23 · Вишнёвый мокко + хром»
 */
export function nailsSummary(d: Design): string {
  const items = d.nails.map(nailSummary);
  const count = new Map<string, number>();
  for (const t of items) count.set(t, (count.get(t) ?? 0) + 1);
  let base: string | null = null;
  for (const t of items) if ((count.get(t) ?? 0) >= 2 && (base === null || count.get(t)! > count.get(base)!)) base = t;
  const groups = new Map<string, string[]>();
  items.forEach((t, i) => {
    if (t === base) return;
    groups.set(t, [...(groups.get(t) ?? []), nailName(i)]);
  });
  const parts = base === null ? [] : [base];
  for (const [t, names] of groups) parts.push(`${joinNames(names)} — ${t}`);
  return parts.join("; ");
}

/** «мужской маникюр, мягкий квадрат, короткая длина, DN M2 · Матовое укрепление» */
export function designSummary(d: Design): string {
  const head = d.hand === "his" ? ["мужской маникюр"] : [];
  return [...head, SHAPE_LABEL[d.shape], LENGTH_LABEL[d.length], nailsSummary(d)].join(", ");
}

/** «Привет! Хочу записаться: миндаль, средняя длина, <оттенок> + хром. Мой дизайн: <ссылка>» */
export function telegramText(d: Design | null, url: string): string {
  if (!d) return "Привет! Хочу записаться.";
  return `Привет! Хочу записаться: ${designSummary(d)}. Мой дизайн: ${url}`;
}

/** t.me/divanail21 с готовым текстом. */
export function telegramUrl(text: string): string {
  return `${STUDIO.telegram.url}?text=${encodeURIComponent(text)}`;
}

/** Текст в буфер обмена; без доступа к буферу — через скрытое поле. true — скопировано. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // нет разрешения — пробуем старый способ
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

/**
 * Начало записи в Telegram: текст — в буфер (до перехода), цель Метрики.
 * Сам переход — ссылкой <a href={telegramUrl(text)}> или openTelegram.
 */
export function startTelegram(text: string): Promise<boolean> {
  const copied = copyText(text);
  goal("book_telegram");
  return copied;
}

/** Буфер + t.me с текстом. Вызывать прямо из обработчика нажатия: окно открывается в том же такте. */
export async function openTelegram(text: string): Promise<void> {
  const copied = startTelegram(text);
  window.open(telegramUrl(text), "_blank", "noopener");
  await copied;
}
