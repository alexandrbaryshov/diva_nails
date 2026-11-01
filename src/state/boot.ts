import { effect, signal, type ReadonlySignal } from "@preact/signals";
import { goal } from "../analytics";
import type { DesignStore } from "./store";
import { readDesignFromLocation, writeDesignToLocation, type LinkWarning } from "./link";

const notice = signal<LinkWarning[]>([]);

/**
 * Что случилось при открытии по ссылке: [] — всё открылось как было (или ссылки не было);
 * "bad-link" / "old-version" — показан дизайн месяца; "unknown-shade" — оттенок заменён ближайшим.
 */
export const linkNotice: ReadonlySignal<LinkWarning[]> = notice;

/**
 * Старт конструктора: дизайн из #d=… (одним шагом истории, как load), дальше каждое
 * изменение дизайна пишется в адрес через replaceState. Возвращает отписку.
 */
export function bootFromLocation(target: DesignStore, loc: Location = location): () => void {
  goal("constructor_open");
  const linked = readDesignFromLocation(loc);
  if (linked) {
    target.load(linked.design);
    notice.value = linked.warnings;
    const opened = !linked.warnings.includes("bad-link") && !linked.warnings.includes("old-version");
    if (opened) goal("design_link_open");
    // в адресе — то, что реально открыто (битая ссылка → дизайн месяца, пропавший оттенок → ближайший)
    writeDesignToLocation(target.design.value);
  } else {
    notice.value = [];
  }

  let first = true;
  let changed = false;
  return effect(() => {
    const d = target.design.value;
    if (first) {
      first = false;
      return;
    }
    writeDesignToLocation(d);
    if (!changed) {
      changed = true;
      goal("nail_change");
    }
  });
}
