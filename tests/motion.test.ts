import type { Signal } from "@preact/signals";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lampSequence, reducedMotion, strokeNail, tilt, useTiltSheen } from "../src/motion";
import { saveFlow } from "../src/card";

const SVG = "http://www.w3.org/2000/svg";
const setReduced = (v: boolean) => ((reducedMotion as Signal<boolean>).value = v);

/** Ноготь, как его рисует NailFinish: <g data-nail-paint> с внутренней группой в системе координат ногтя. */
function paintGroup() {
  const svg = document.createElementNS(SVG, "svg");
  const outer = document.createElementNS(SVG, "g");
  outer.setAttribute("data-nail-paint", "");
  outer.setAttribute("data-axis", "20");
  const inner = document.createElementNS(SVG, "g");
  inner.setAttribute("transform", "translate(100 200) rotate(20)");
  inner.appendChild(document.createElementNS(SVG, "path"));
  outer.appendChild(inner);
  svg.appendChild(outer);
  document.body.appendChild(svg);
  // jsdom не считает геометрию: ноготь длиной 90 вдоль оси, от y = 0 (кутикула) до y = −90
  (inner as unknown as { getBBox(): DOMRect }).getBBox = () => ({ x: -20, y: -90, width: 40, height: 90 }) as DOMRect;
  return { outer, inner };
}

interface FakeAnim {
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
  target: Element;
  finish(): void;
  cancelled: boolean;
}
const anims: FakeAnim[] = [];

beforeEach(() => {
  anims.length = 0;
  setReduced(false);
  Element.prototype.animate = function (this: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
    let done!: () => void;
    let fail!: (e: unknown) => void;
    const finished = new Promise<void>((res, rej) => ((done = res), (fail = rej)));
    finished.catch(() => undefined);
    const a: FakeAnim = {
      keyframes,
      options,
      target: this,
      cancelled: false,
      finish: () => done(),
    };
    anims.push(a);
    return {
      finished,
      cancel() {
        a.cancelled = true;
        fail(new DOMException("cancelled", "AbortError"));
      },
    } as unknown as Animation;
  } as unknown as typeof Element.prototype.animate;
});

afterEach(() => {
  document.body.innerHTML = "";
  // jsdom не знает matchMedia: тесты подставляют свой и убирают его
  Reflect.deleteProperty(window, "matchMedia");
  setReduced(false);
  vi.useRealTimers();
});

describe("мазок кисти", () => {
  it("кладёт маску вдоль оси ногтя на 300–400 мс и убирает её по окончании", async () => {
    const { outer, inner } = paintGroup();
    let settled = false;
    const run = strokeNail(outer as unknown as SVGElement, 20).then(() => (settled = true));
    await Promise.resolve();

    expect(anims).toHaveLength(1);
    expect(anims[0].options.duration).toBeGreaterThanOrEqual(300);
    expect(anims[0].options.duration).toBeLessThanOrEqual(400);
    const maskId = /^url\(#(.+)\)$/.exec(inner.getAttribute("mask") ?? "")?.[1];
    expect(maskId).toBeTruthy();
    expect(outer.querySelector(`mask[id="${maskId}"]`)).not.toBeNull();
    expect(settled).toBe(false);

    anims[0].finish();
    await run;
    expect(inner.hasAttribute("mask")).toBe(false);
    expect(outer.querySelector("mask")).toBeNull();
  });

  it("мазок идёт от кутикулы к краю: маска сдвигается вдоль оси ногтя на его длину", async () => {
    const { outer } = paintGroup();
    void strokeNail(outer as unknown as SVGElement, 20);
    await Promise.resolve();
    const [from, to] = anims[0].keyframes as { transform: string }[];
    expect(from.transform).toMatch(/translateY\(0(px)?\)/);
    const shift = Number(/translateY\((-?[\d.]+)px\)/.exec(to.transform)?.[1]);
    expect(shift).toBeLessThan(-90); // длина 90 и мягкий край
  });

  it("новый тап во время мазка побеждает: старая маска снята, старый промис завершён", async () => {
    const { outer, inner } = paintGroup();
    let firstDone = false;
    const first = strokeNail(outer as unknown as SVGElement, 20).then(() => (firstDone = true));
    await Promise.resolve();
    const second = strokeNail(outer as unknown as SVGElement, 20);
    await first;

    expect(firstDone).toBe(true);
    expect(anims[0].cancelled).toBe(true);
    expect(anims).toHaveLength(2);
    expect(outer.querySelectorAll("mask")).toHaveLength(1);
    expect(inner.getAttribute("mask")).toContain(outer.querySelector("mask")!.id);
    anims[1].finish();
    await second;
    expect(outer.querySelector("mask")).toBeNull();
  });

  it("при prefers-reduced-motion смена мгновенная: ни анимации, ни маски", async () => {
    setReduced(true);
    const { outer, inner } = paintGroup();
    await strokeNail(outer as unknown as SVGElement, 20);
    expect(anims).toHaveLength(0);
    expect(inner.hasAttribute("mask")).toBe(false);
  });

  it("вибрация 12 мс — только если есть navigator.vibrate и экран сенсорный; без неё ошибок нет", async () => {
    window.matchMedia = ((q: string) => ({ matches: q.includes("pointer: coarse"), addEventListener() {} })) as unknown as typeof window.matchMedia;
    const vibrate = vi.fn(() => true);
    Object.defineProperty(navigator, "vibrate", { value: vibrate, configurable: true });
    const { outer } = paintGroup();
    void strokeNail(outer as unknown as SVGElement, 20);
    await Promise.resolve();
    expect(vibrate).toHaveBeenCalledWith(12);

    Object.defineProperty(navigator, "vibrate", { value: undefined, configurable: true });
    const second = paintGroup();
    expect(() => void strokeNail(second.outer as unknown as SVGElement, 20)).not.toThrow();
    anims.forEach((a) => a.finish());
  });
});

describe("сушка в лампе", () => {
  function stage() {
    const el = document.createElement("div");
    el.className = "dn-stage";
    el.innerHTML = '<div class="dn-hands"></div>';
    document.body.appendChild(el);
    return el;
  }
  const count = (el: HTMLElement) => el.querySelector(".dn-lamp-count")?.textContent;

  it("тикает 3 → 2 → 1, держит «1» до готовности карточки, потом снимает лампу", async () => {
    vi.useFakeTimers();
    const el = stage();
    let finish!: (v: unknown) => void;
    const ready = new Promise((r) => (finish = r));
    let done = false;
    const run = lampSequence(el, ready).then(() => (done = true));

    const seen: string[] = [];
    for (let t = 0; t < 8000; t += 50) {
      await vi.advanceTimersByTimeAsync(50);
      const c = count(el);
      if (c && seen[seen.length - 1] !== c) seen.push(c);
    }
    expect(seen).toEqual(["3", "2", "1"]);
    expect(count(el)).toBe("1"); // готовности нет — лампа ждёт
    expect(done).toBe(false);

    finish("png");
    await vi.advanceTimersByTimeAsync(3000);
    await run;
    expect(done).toBe(true);
    expect(el.querySelector(".dn-lamp")).toBeNull();
    expect(el.classList.contains("is-drying")).toBe(false);
  });

  it("если карточка готова раньше, лампа всё равно отсчитывает до «1» и не зависает после ошибки сборки", async () => {
    vi.useFakeTimers();
    const el = stage();
    const run = lampSequence(el, Promise.reject(new Error("png")));
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(run).resolves.toBeUndefined();
    expect(el.querySelector(".dn-lamp")).toBeNull();
  });

  it("при prefers-reduced-motion лампы нет: промис ждёт только готовности", async () => {
    setReduced(true);
    const el = stage();
    let finish!: (v: unknown) => void;
    const ready = new Promise((r) => (finish = r));
    let done = false;
    const run = lampSequence(el, ready).then(() => (done = true));
    await Promise.resolve();
    expect(el.querySelector(".dn-lamp")).toBeNull();
    expect(done).toBe(false);
    finish("png");
    await run;
    expect(done).toBe(true);
  });
});

describe("блик за наклоном", () => {
  const fire = (gamma: number, beta = 0) => window.dispatchEvent(Object.assign(new Event("deviceorientation"), { gamma, beta }));

  afterEach(() => {
    tilt.stop();
    tilt.reset();
    // @ts-expect-error — убираем подмену
    delete window.DeviceOrientationEvent;
    document.documentElement.removeAttribute("data-tilt");
    document.documentElement.style.removeProperty("--dn-tilt");
  });

  it("без датчика: недоступен, разрешение не спрашивается", async () => {
    expect(tilt.available()).toBe(false);
    const hook = useTiltSheen();
    expect(hook.enabled).toBe(false);
    await expect(hook.request()).resolves.toBe(false);
  });

  it("iOS: разрешение спрашивается по запросу; «да» включает блик, угол наклона уходит в --dn-tilt", async () => {
    const requestPermission = vi.fn(() => Promise.resolve("granted"));
    Object.assign(window, { DeviceOrientationEvent: Object.assign(function () {}, { requestPermission }) });
    window.matchMedia = ((q: string) => ({ matches: q.includes("pointer: coarse"), addEventListener() {} })) as unknown as typeof window.matchMedia;
    expect(tilt.available()).toBe(true);
    await expect(useTiltSheen().request()).resolves.toBe(true);
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(useTiltSheen().enabled).toBe(true);
    expect(document.documentElement.hasAttribute("data-tilt")).toBe(true);

    fire(15);
    expect(Number(document.documentElement.style.getPropertyValue("--dn-tilt"))).toBeCloseTo(0.5, 2);
    fire(90); // крайний наклон не выходит за ±1
    expect(Number(document.documentElement.style.getPropertyValue("--dn-tilt"))).toBe(1);
  });

  it("отказ запоминается: повторно разрешение не спрашивается", async () => {
    const requestPermission = vi.fn(() => Promise.resolve("denied"));
    Object.assign(window, { DeviceOrientationEvent: Object.assign(function () {}, { requestPermission }) });
    window.matchMedia = ((q: string) => ({ matches: q.includes("pointer: coarse"), addEventListener() {} })) as unknown as typeof window.matchMedia;
    await expect(useTiltSheen().request()).resolves.toBe(false);
    await expect(useTiltSheen().request()).resolves.toBe(false);
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(tilt.available()).toBe(false); // кнопка больше не предлагается
  });
});

describe("сохранение", () => {
  it("saveFlow.open вызывается без ошибок", () => {
    expect(() => saveFlow.open()).not.toThrow();
  });
});
