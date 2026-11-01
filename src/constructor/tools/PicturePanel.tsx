// «Картинка»: своё фото на ноготь (принт по форме ногтя) или как референс «хочу похоже».
import { useRef, useState } from "preact/hooks";
import type { Print } from "../../state/design";
import { PanelFrame } from "./Panels";
import { useStore } from "./context";
import { IconClose, IconMinus, IconPlus, IconRotate } from "./icons";
import { NAIL_NAMES } from "./labels";
import { prepareImage } from "./image";

export const PRIVACY_NOTE = "Картинка никуда не уходит — она остаётся только у тебя в браузере";
export const PRINT_SCALE: readonly [number, number] = [0.4, 4];

export function clampPrint(p: Print): Print {
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  return {
    ...p,
    x: clamp(p.x, 0, 1),
    y: clamp(p.y, 0, 1),
    scale: clamp(p.scale, PRINT_SCALE[0], PRINT_SCALE[1]),
    rot: ((p.rot % 360) + 360) % 360,
  };
}

export function PicturePanel() {
  const s = useStore();
  const sel = s.selected.value;
  const target = sel ?? 3;
  const print = s.prints.value.find((p) => p.nail === target);
  const reference = s.reference.value;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nailInput = useRef<HTMLInputElement>(null);
  const refInput = useRef<HTMLInputElement>(null);

  const take = async (input: HTMLInputElement, mode: "nail" | "reference") => {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    setBusy(true);
    const res = await prepareImage(file);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    if (mode === "reference") {
      s.setReference({ url: res.url });
      return;
    }
    if (sel === null) s.selected.value = target;
    s.setPrint({ nail: target, url: res.url, x: 0.5, y: 0.5, scale: 1, rot: 0 }, target);
  };

  const nudge = (patch: (p: Print) => Partial<Print>) => {
    if (!print) return;
    s.setPrint(clampPrint({ ...print, ...patch(print) }), target);
    s.endGesture();
  };

  return (
    <PanelFrame id="picture" title="Картинка" target>
      <p class="dn-hint-line">
        {sel === null ? "Картинка ляжет на безымянный — нажми на другой ноготь, чтобы сменить" : `Картинка на ноготь: ${NAIL_NAMES[target].toLowerCase()}`}
      </p>
      <div class="dn-chips">
        <button type="button" class="dn-chip dn-chip--strong" disabled={busy} onClick={() => nailInput.current?.click()}>
          На ноготь
        </button>
        <button type="button" class="dn-chip" disabled={busy} onClick={() => refInput.current?.click()}>
          Как референс
        </button>
        <input
          ref={nailInput}
          class="dn-file-input"
          type="file"
          accept="image/*"
          tabIndex={-1}
          aria-hidden="true"
          data-picture="nail"
          onChange={(e) => void take(e.currentTarget, "nail")}
        />
        <input
          ref={refInput}
          class="dn-file-input"
          type="file"
          accept="image/*"
          tabIndex={-1}
          aria-hidden="true"
          data-picture="reference"
          onChange={(e) => void take(e.currentTarget, "reference")}
        />
      </div>
      {error && (
        <p class="dn-note dn-note--error" role="alert">
          {error}
        </p>
      )}
      {print && (
        <div class="dn-print-tools">
          <p class="dn-hint-line">Двигай картинку пальцем по ногтю; два пальца или колесо — размер и поворот</p>
          <div class="dn-chips">
            <button type="button" class="dn-icon-btn" aria-label="Картинка меньше" onClick={() => nudge((p) => ({ scale: p.scale / 1.2 }))}>
              <IconMinus size={18} />
            </button>
            <button type="button" class="dn-icon-btn" aria-label="Картинка больше" onClick={() => nudge((p) => ({ scale: p.scale * 1.2 }))}>
              <IconPlus size={18} />
            </button>
            <button type="button" class="dn-icon-btn" aria-label="Повернуть картинку" onClick={() => nudge((p) => ({ rot: p.rot + 15 }))}>
              <IconRotate size={18} />
            </button>
            <button type="button" class="dn-chip" onClick={() => s.setPrint(null, target)}>
              Убрать с ногтя
            </button>
          </div>
        </div>
      )}
      {reference && (
        <div class="dn-ref-row">
          <img class="dn-ref-thumb" src={reference.url} alt="Референс: хочу похоже" width={44} height={44} />
          <span class="dn-ref-caption">хочу похоже</span>
          <button type="button" class="dn-icon-btn" aria-label="Убрать референс" onClick={() => s.setReference(null)}>
            <IconClose size={18} />
          </button>
        </div>
      )}
      <p class="dn-note">{PRIVACY_NOTE}</p>
    </PanelFrame>
  );
}
