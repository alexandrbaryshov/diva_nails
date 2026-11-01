// Кнопка «Блик за наклоном»: только на телефоне, только когда на руке есть хром, разрешение — по тапу.
import { render } from "preact";
import { store } from "../state/store";
import { reducedMotion, tilt, tiltEnabled } from "./index";

export const TILT_LABEL = "Блик за наклоном";

export function TiltButton() {
  const shiny = store.design.value.nails.some((n) => n.shade !== null && (n.effect === "chrome" || n.effect === "cat-eye"));
  const on = tiltEnabled.value;
  // reducedMotion читаем, чтобы кнопка пропала, если настройку включили на лету
  if (reducedMotion.value || !shiny || (!on && !tilt.available())) return null;
  return (
    <button
      type="button"
      class="dn-tilt"
      aria-pressed={on}
      onClick={() => {
        if (on) tilt.stop();
        else void tilt.request().then(() => undefined);
      }}
    >
      {TILT_LABEL}
    </button>
  );
}

/**
 * Ставит кнопку на сцену конструктора (`.dn-stage`) вторым корнем Preact: сцена принадлежит другому таску,
 * кнопка живёт рядом и ничего в ней не меняет. Возвращает функцию снятия.
 */
export function mountTiltButton(root: ParentNode = document): () => void {
  const stage = root.querySelector(".dn-stage");
  if (!stage) return () => undefined;
  const host = document.createElement("div");
  host.className = "dn-tilt-host";
  stage.appendChild(host);
  render(<TiltButton />, host);
  return () => {
    render(null, host);
    host.remove();
  };
}
