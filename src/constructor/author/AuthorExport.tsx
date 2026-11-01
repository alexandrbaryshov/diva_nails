// Режим автора ?author=1: «Экспорт дизайна в JSON» — запись формата data/designs.json в буфер.
import { useEffect, useState } from "preact/hooks";
import type { Preset } from "../../data/designs";
import type { Design } from "../../state/design";
import { copyText } from "../../booking/telegram";
import { useStore } from "../tools/context";

/** Включён ли режим автора (?author=1 в адресе). */
export function isAuthorMode(search: string): boolean {
  return new URLSearchParams(search).get("author") === "1";
}

/** Запись для data/designs.json → presets[]. Название и теги дописывает автор. */
export function authorEntry(d: Design): Omit<Preset, "month"> {
  return {
    id: "new-design",
    title: "[НАЗВАНИЕ — впиши]",
    tags: { occasion: [], mood: "soft", length: d.length },
    design: d,
    stub: true,
  };
}

export function AuthorExport() {
  const s = useStore();
  const [on, setOn] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  // только в браузере: пререндер и гидратация идут без режима автора
  useEffect(() => setOn(isAuthorMode(location.search)), []);
  if (!on) return null;
  return (
    <div class="dn-author">
      <button
        type="button"
        class="dn-chip dn-chip--strong"
        onClick={async () => {
          const json = JSON.stringify(authorEntry(s.design.value), null, 2);
          const ok = await copyText(json);
          setStatus(ok ? "Скопировано — вставь в data/designs.json и впиши название и теги" : json);
        }}
      >
        Экспорт дизайна в JSON
      </button>
      {status && (
        <p class="dn-note" role="status">
          {status}
        </p>
      )}
    </div>
  );
}
