// Движение: мазок кисти, «сушка в лампе», блик за наклоном. При prefers-reduced-motion всё мгновенно.
import { signal, type ReadonlySignal } from "@preact/signals";
import "./motion.css";

const REDUCED = "(prefers-reduced-motion: reduce)";
const COARSE = "(pointer: coarse)";

function watchReducedMotion(): ReadonlySignal<boolean> {
  const s = signal(false);
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    const mq = window.matchMedia(REDUCED);
    s.value = mq.matches;
    mq.addEventListener?.("change", (e) => {
      s.value = e.matches;
    });
  }
  return s;
}

/** true — пользователь просит меньше движения: всё меняется мгновенно. */
export const reducedMotion: ReadonlySignal<boolean> = watchReducedMotion();

const coarsePointer = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(COARSE).matches;

/* ── мазок кисти ───────────────────────────────────────────────────────────── */

export const STROKE_MS = 360;
const SOFT_EDGE = 0.22; // мягкий край мазка, в долях длины ногтя
const SVG_NS = "http://www.w3.org/2000/svg";

interface Stroke {
  cancel(): void;
}
const running = new WeakMap<Element, Stroke>();
let strokeSeq = 0;
let lastBuzz = 0;

/** Лёгкая вибрация на телефоне, где она есть; пять ногтей «на все» дают одну. */
function buzz(): void {
  if (!coarsePointer() || typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  const now = Date.now();
  if (now - lastBuzz < 80) return;
  lastBuzz = now;
  try {
    navigator.vibrate(12);
  } catch {
    /* вибрация недоступна — не страшно */
  }
}

/**
 * Мазок кисти от кутикулы к краю, 360 мс. `el` — группа покрытия `[data-nail-paint]`.
 * Цвет открывается маской, которая едет вдоль оси ногтя: маска лежит в его собственной системе
 * координат (y вверх — к свободному краю), поэтому наклон `axisAngle` уже учтён. Новый вызов на том же
 * ногте отменяет прежний мазок, побеждает последний.
 */
export function strokeNail(el: SVGElement, _axisAngle: number): Promise<void> {
  running.get(el)?.cancel();
  const inner = el.firstElementChild as SVGGraphicsElement | null;
  if (reducedMotion.value || !inner || typeof inner.animate !== "function") return Promise.resolve();
  buzz();

  let box: { x: number; y: number; width: number; height: number };
  try {
    box = inner.getBBox();
  } catch {
    return Promise.resolve();
  }
  if (!(box.height > 0)) return Promise.resolve();

  const id = `dn-stroke-${++strokeSeq}`;
  const bottom = box.y + box.height + 2; // кутикула
  const soft = box.height * SOFT_EDGE;
  const maskEl = document.createElementNS(SVG_NS, "mask");
  maskEl.setAttribute("id", id);
  maskEl.setAttribute("maskUnits", "userSpaceOnUse");
  maskEl.setAttribute("x", String(box.x - 20));
  maskEl.setAttribute("y", String(box.y - soft - 20));
  maskEl.setAttribute("width", String(box.width + 40));
  maskEl.setAttribute("height", String(box.height + soft + 60));
  maskEl.innerHTML =
    `<linearGradient id="${id}-g" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#000"/><stop offset="${(soft / (soft + 40)).toFixed(3)}" stop-color="#fff"/></linearGradient>` +
    `<rect x="${box.x - 20}" y="${bottom}" width="${box.width + 40}" height="${soft + 40}" fill="url(#${id}-g)"/>`;
  const rect = maskEl.querySelector("rect") as SVGRectElement;
  el.appendChild(maskEl);
  inner.setAttribute("mask", `url(#${id})`);

  return new Promise<void>((resolve) => {
    let over = false;
    const finish = () => {
      if (over) return;
      over = true;
      if (running.get(el) === stroke) running.delete(el);
      inner.removeAttribute("mask");
      maskEl.remove();
      resolve();
    };
    const travel = bottom - box.y + soft; // верх маски: от кутикулы за свободный край
    const anim = rect.animate(
      [{ transform: "translateY(0px)" }, { transform: `translateY(${(-travel).toFixed(1)}px)` }],
      { duration: STROKE_MS, easing: "cubic-bezier(0.33, 0, 0.2, 1)", fill: "forwards" },
    );
    const stroke: Stroke = {
      cancel() {
        anim.cancel();
        finish();
      },
    };
    running.set(el, stroke);
    anim.finished.then(finish, finish);
  });
}

/* ── сушка в лампе ─────────────────────────────────────────────────────────── */

const LAMP_IN_MS = 420;
const LAMP_TICK_MS = 560;
const LAMP_OUT_MS = 560;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * «Сушка в лампе», пока собирается карточка: рука уезжает под лампу, 3 → 2 → 1, «1» держится,
 * пока `ready` не выполнится, потом рука выходит с бликом. Завершается, когда лампа убрана
 * (ошибку `ready` обрабатывает вызывающий). При reducedMotion — только ждёт `ready`.
 */
export async function lampSequence(stage: HTMLElement, ready: Promise<unknown>): Promise<void> {
  const settled = ready.then(
    () => undefined,
    () => undefined,
  );
  if (reducedMotion.value) return settled;

  const lamp = document.createElement("div");
  lamp.className = "dn-lamp";
  lamp.setAttribute("role", "status");
  lamp.setAttribute("aria-label", "Сушим в лампе");
  lamp.innerHTML =
    '<div class="dn-lamp-glow"></div><div class="dn-lamp-body"><i class="dn-lamp-slot"></i></div>' +
    '<b class="dn-lamp-count" aria-hidden="true"></b><i class="dn-lamp-gloss"></i>';
  const count = lamp.querySelector(".dn-lamp-count") as HTMLElement;
  stage.appendChild(lamp);
  stage.classList.add("is-drying");
  void lamp.offsetWidth; // стартовое состояние применено — дальше переходы
  stage.dataset.lamp = "in";
  try {
    await sleep(LAMP_IN_MS);
    stage.dataset.lamp = "tick";
    for (const n of ["3", "2", "1"]) {
      count.textContent = n;
      lamp.setAttribute("aria-label", `Сушим в лампе: ${n}`);
      count.classList.remove("is-tick");
      void count.offsetWidth;
      count.classList.add("is-tick");
      await sleep(LAMP_TICK_MS);
    }
    await settled;
    stage.dataset.lamp = "out";
    count.textContent = "";
    await sleep(LAMP_OUT_MS);
  } finally {
    delete stage.dataset.lamp;
    stage.classList.remove("is-drying");
    lamp.remove();
  }
}

/* ── блик за наклоном ──────────────────────────────────────────────────────── */

type OrientationCtor = { requestPermission?: () => Promise<string> };
const DENIED_KEY = "dn-tilt-denied";

export const tiltEnabled = signal(false);
const tiltDenied = signal(false);
let tiltListener: ((e: Event) => void) | null = null;

function storage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function startTilt(): void {
  if (tiltListener) return;
  const root = document.documentElement;
  tiltListener = (e) => {
    const gamma = (e as DeviceOrientationEvent).gamma;
    if (typeof gamma !== "number" || Number.isNaN(gamma)) return;
    const v = Math.max(-1, Math.min(1, gamma / 30));
    root.style.setProperty("--dn-tilt", v.toFixed(3));
  };
  window.addEventListener("deviceorientation", tiltListener);
  root.setAttribute("data-tilt", "");
  tiltEnabled.value = true;
}

/** Блик за наклоном: разрешение — по тапу (iOS), отказ запоминается на сессию, повторно не спрашиваем. */
export const tilt = {
  /** можно ли предложить кнопку: есть датчик, экран сенсорный, не отказано и не просили меньше движения */
  available(): boolean {
    if (typeof window === "undefined" || typeof window.DeviceOrientationEvent === "undefined") return false;
    return coarsePointer() && !reducedMotion.value && !(tiltDenied.value || storage()?.getItem(DENIED_KEY) === "1");
  },
  async request(): Promise<boolean> {
    if (tiltEnabled.value) return true;
    if (!tilt.available()) return false;
    const ctor = window.DeviceOrientationEvent as unknown as OrientationCtor;
    if (typeof ctor.requestPermission === "function") {
      let answer = "denied";
      try {
        answer = await ctor.requestPermission();
      } catch {
        /* вызов не по тапу или запрещён — считаем отказом */
      }
      if (answer !== "granted") {
        tiltDenied.value = true;
        try {
          storage()?.setItem(DENIED_KEY, "1");
        } catch {
          /* без хранилища отказ помнит модуль */
        }
        return false;
      }
    }
    startTilt();
    return true;
  },
  stop(): void {
    if (tiltListener) window.removeEventListener("deviceorientation", tiltListener);
    tiltListener = null;
    if (typeof document !== "undefined") {
      document.documentElement.removeAttribute("data-tilt");
      document.documentElement.style.removeProperty("--dn-tilt");
    }
    tiltEnabled.value = false;
  },
  /** забыть отказ (для тестов) */
  reset(): void {
    tiltDenied.value = false;
    try {
      storage()?.removeItem(DENIED_KEY);
    } catch {
      /* нечего забывать */
    }
  },
};

/** Блик за наклоном телефона. `enabled` — блик уже включён; `request` спрашивает разрешение (вызывать из тапа). */
export function useTiltSheen(): { enabled: boolean; request(): Promise<boolean> } {
  return { enabled: tiltEnabled.value, request: tilt.request };
}
