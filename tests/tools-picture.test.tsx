import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Constructor } from "../src/constructor/Constructor";
import { nailFrame } from "../src/constructor/geometry";
import { HANDS } from "../src/constructor/hands";
import * as image from "../src/constructor/tools/image";
import { MONTH_PRESET } from "../src/data/designs";
import { snapDecorCoord } from "../src/state/design";
import { createDesignStore, type DesignStore } from "../src/state/store";

let s: DesignStore;
const IDENTITY = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

beforeEach(() => {
  // jsdom не считает геометрию SVG: координаты экрана = координаты руки
  (SVGElement.prototype as unknown as { getScreenCTM(): typeof IDENTITY }).getScreenCTM = () => IDENTITY;
  s = createDesignStore(MONTH_PRESET.design);
  render(<Constructor store={s} />);
});
afterEach(cleanup);

const tool = (name: string) => within(screen.getByRole("toolbar", { name: "Инструменты" })).getByRole("button", { name });
const panel = (name: string) => screen.getByRole("region", { name });
const nailEl = (i: number) => document.querySelector<SVGGElement>(`#constructor [data-nail="${i}"]`)!;
const fileInput = (kind: "nail" | "reference") => document.querySelector<HTMLInputElement>(`input[data-picture="${kind}"]`)!;

function choose(input: HTMLInputElement, file: File) {
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  fireEvent.change(input);
}

describe("«Картинка»", () => {
  it("не картинка — понятное сообщение, ничего не ложится", async () => {
    fireEvent.click(tool("Картинка"));
    expect(within(panel("Картинка")).getByText(/картинка никуда не уходит/i)).toBeTruthy();
    choose(fileInput("nail"), new File(["hello"], "notes.txt", { type: "text/plain" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Это не картинка — выбери фото или скрин");
    expect(s.prints.value).toEqual([]);
  });

  it("«На ноготь»: принт на выбранном ногте; больше/поворот/убрать", async () => {
    vi.spyOn(image, "prepareImage").mockResolvedValue({ ok: true, url: "blob:photo", width: 800, height: 600 });
    fireEvent.click(nailEl(1));
    fireEvent.click(tool("Картинка"));
    choose(fileInput("nail"), new File(["x"], "photo.jpg", { type: "image/jpeg" }));
    await waitFor(() => expect(s.prints.value).toHaveLength(1));
    expect(s.prints.value[0]).toMatchObject({ nail: 1, url: "blob:photo", x: 0.5, y: 0.5, scale: 1, rot: 0 });
    // принт внутри clipPath ногтя
    const img = nailEl(1).querySelector("[clip-path] image");
    expect(img?.getAttribute("href")).toBe("blob:photo");

    fireEvent.click(screen.getByRole("button", { name: "Картинка больше" }));
    expect(s.prints.value[0].scale).toBeCloseTo(1.2);
    fireEvent.click(screen.getByRole("button", { name: "Повернуть картинку" }));
    expect(s.prints.value[0].rot).toBe(15);
    fireEvent.click(screen.getByRole("button", { name: "Убрать с ногтя" }));
    expect(s.prints.value).toEqual([]);
    // каждое нажатие — свой шаг: отмена возвращает поворот
    s.undo();
    expect(s.prints.value[0].rot).toBe(15);
    s.undo();
    expect(s.prints.value[0].rot).toBe(0);
  });

  it("«Как референс» — миниатюра «хочу похоже» у руки", async () => {
    vi.spyOn(image, "prepareImage").mockResolvedValue({ ok: true, url: "blob:ref", width: 800, height: 600 });
    fireEvent.click(tool("Картинка"));
    choose(fileInput("reference"), new File(["x"], "pin.png", { type: "image/png" }));
    await waitFor(() => expect(s.reference.value).toEqual({ url: "blob:ref" }));
    const fig = document.querySelector(".dn-stage figure")!;
    expect(fig.textContent).toContain("хочу похоже");
    expect(fig.querySelector("img")?.getAttribute("src")).toBe("blob:ref");
  });

  it("принт двигается пальцем и колесом; конец жеста закрывает шаг истории", async () => {
    vi.spyOn(image, "prepareImage").mockResolvedValue({ ok: true, url: "blob:p", width: 800, height: 600 });
    fireEvent.click(nailEl(2));
    fireEvent.click(tool("Картинка"));
    choose(fileInput("nail"), new File(["x"], "p.jpg", { type: "image/jpeg" }));
    await waitFor(() => expect(s.prints.value).toHaveLength(1));
    const end = vi.spyOn(s, "endGesture");
    const f = nailFrame(HANDS.her.anchors[2], s.design.value.length);
    const [x0, y0] = f.toHand(0.5, 0.5);
    const [x1, y1] = f.toHand(0.7, 0.4);
    const target = nailEl(2).querySelector("[clip-path] image")!;
    fireEvent.pointerDown(target, { pointerId: 1, clientX: x0, clientY: y0, pointerType: "touch" });
    fireEvent.pointerMove(target, { pointerId: 1, clientX: (x0 + x1) / 2, clientY: (y0 + y1) / 2, pointerType: "touch" });
    fireEvent.pointerMove(target, { pointerId: 1, clientX: x1, clientY: y1, pointerType: "touch" });
    fireEvent.pointerUp(target, { pointerId: 1, clientX: x1, clientY: y1, pointerType: "touch" });
    expect(s.prints.value[0].x).toBeCloseTo(0.7);
    expect(s.prints.value[0].y).toBeCloseTo(0.4);
    expect(end).toHaveBeenCalled();
    s.undo();
    expect(s.prints.value[0]).toMatchObject({ x: 0.5, y: 0.5 });
    s.redo();

    vi.useFakeTimers();
    end.mockClear();
    fireEvent.wheel(target, { deltaY: -200 });
    fireEvent.wheel(target, { deltaY: -200 });
    expect(s.prints.value[0].scale).toBeGreaterThan(1);
    vi.advanceTimersByTime(400);
    expect(end).toHaveBeenCalled();
    vi.useRealTimers();
  });
});

describe("декор тянется по ногтю", () => {
  it("палец и мышь: декор едет в пределах ногтя, весь жест — один шаг", () => {
    fireEvent.click(nailEl(2));
    fireEvent.click(tool("Дизайн"));
    fireEvent.click(within(panel("Дизайн")).getByRole("button", { name: "Страза-кристалл" }));
    const start = s.design.value.nails[2].decor[0];
    const end = vi.spyOn(s, "endGesture");
    const f = nailFrame(HANDS.her.anchors[2], s.design.value.length);
    for (const pointerType of ["touch", "mouse"]) {
      const before = s.design.value.nails[2].decor[0];
      const [x0, y0] = f.toHand(before.u, before.v);
      const [x1, y1] = f.toHand(pointerType === "touch" ? 0.2 : 0.8, 0.6);
      const gem = nailEl(2).querySelector("[data-decor='0']")!;
      fireEvent.pointerDown(gem, { pointerId: 5, clientX: x0, clientY: y0, pointerType });
      fireEvent.pointerMove(gem, { pointerId: 5, clientX: x1, clientY: (y0 + y1) / 2, pointerType });
      fireEvent.pointerMove(gem, { pointerId: 5, clientX: x1, clientY: y1, pointerType });
      fireEvent.pointerUp(gem, { pointerId: 5, clientX: x1, clientY: y1, pointerType });
      expect(end).toHaveBeenCalled();
      const after = s.design.value.nails[2].decor[0];
      expect(after.u).toBe(snapDecorCoord(pointerType === "touch" ? 0.2 : 0.8));
      expect(after.v).toBe(snapDecorCoord(0.6));
      s.undo();
      expect(s.design.value.nails[2].decor[0]).toEqual(before);
      s.redo();
    }
    // за пределы ногтя не уходит
    const [xa, ya] = f.toHand(0.5, 0.5);
    const gem = nailEl(2).querySelector("[data-decor='0']")!;
    fireEvent.pointerDown(gem, { pointerId: 6, clientX: xa, clientY: ya, pointerType: "mouse" });
    fireEvent.pointerMove(gem, { pointerId: 6, clientX: xa + 5000, clientY: ya + 5000, pointerType: "mouse" });
    fireEvent.pointerUp(gem, { pointerId: 6, pointerType: "mouse" });
    const d = s.design.value.nails[2].decor[0];
    for (const v of [d.u, d.v]) {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(1);
    }
    expect(start).toBeTruthy();
  });
});
