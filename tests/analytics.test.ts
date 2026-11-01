import { afterEach, describe, expect, it } from "vitest";
import { analyticsEnabled, createAnalytics, goal, initAnalytics } from "../src/analytics";

type YmWindow = Window & { ym?: unknown };

afterEach(() => {
  delete (window as YmWindow).ym;
  document.head.querySelectorAll("script").forEach((s) => s.remove());
});

describe("Яндекс Метрика", () => {
  it("без номера счётчика скрипт не грузится, цели — пустые вызовы", () => {
    expect(analyticsEnabled).toBe(false);
    initAnalytics();
    goal("constructor_open");
    goal("design_link_open");
    expect(document.querySelectorAll("script")).toHaveLength(0);
    expect((window as YmWindow).ym).toBeUndefined();
  });

  it("с номером — один скрипт mc.yandex.ru и reachGoal для цели", () => {
    const a = createAnalytics(12345678);
    expect(a.enabled).toBe(true);
    a.init();
    a.init();
    const scripts = [...document.querySelectorAll("script")];
    expect(scripts).toHaveLength(1);
    expect(scripts[0].src).toBe("https://mc.yandex.ru/metrika/tag.js");
    a.goal("card_save");
    const queue = ((window as YmWindow).ym as { a?: IArguments[] }).a ?? [];
    const calls = queue.map((args) => [...args]);
    expect(calls).toContainEqual([12345678, "reachGoal", "card_save"]);
  });
});
