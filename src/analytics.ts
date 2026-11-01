import { STUDIO } from "./data/studio";

export type Goal =
  | "constructor_open"
  | "nail_change"
  | "card_save"
  | "book_telegram"
  | "book_yclients"
  | "design_link_open";

export interface Analytics {
  /** true — номер счётчика есть, Метрика подключается (и показывается уведомление о cookies) */
  enabled: boolean;
  /** подключить счётчик; без номера — ничего */
  init(): void;
  goal(name: Goal): void;
}

type Ym = ((id: number, action: string, ...args: unknown[]) => void) & { a?: IArguments[]; l?: number };

function ym(): Ym | undefined {
  return (window as Window & { ym?: Ym }).ym;
}

export function createAnalytics(metrikaId: number | null): Analytics {
  let started = false;
  const live = () => metrikaId !== null && typeof window !== "undefined";

  return {
    enabled: metrikaId !== null,
    init() {
      if (!live() || started || metrikaId === null) return;
      started = true;
      // Стандартная очередь Метрики: вызовы копятся, пока не загрузится tag.js.
      const w = window as Window & { ym?: Ym };
      if (!w.ym) {
        const queue: Ym = function (this: unknown) {
          // eslint-disable-next-line prefer-rest-params
          (queue.a = queue.a || []).push(arguments);
        } as Ym;
        queue.l = Date.now();
        w.ym = queue;
      }
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://mc.yandex.ru/metrika/tag.js";
      document.head.appendChild(script);
      w.ym(metrikaId, "init", { clickmap: true, trackLinks: true, accurateTrackBounce: true });
    },
    goal(name) {
      if (!live() || metrikaId === null) return;
      ym()?.(metrikaId, "reachGoal", name);
    },
  };
}

/**
 * Номер счётчика: data/studio.json → metrikaId (одна строка конфига). Для проверки обоих случаев в e2e страница может
 * до загрузки скрипта положить `window.__DN_CONFIG__ = { metrikaId: <число | null> }` — без пересборки.
 */
function configuredMetrikaId(): number | null {
  if (typeof window === "undefined") return STUDIO.metrikaId;
  const override = (window as Window & { __DN_CONFIG__?: { metrikaId?: unknown } }).__DN_CONFIG__?.metrikaId;
  if (override === null || (typeof override === "number" && Number.isFinite(override))) return override;
  return STUDIO.metrikaId;
}

const analytics = createAnalytics(configuredMetrikaId());

export const analyticsEnabled: boolean = analytics.enabled;
export const initAnalytics: () => void = analytics.init;
/** Цель Метрики. При STUDIO.metrikaId === null — ничего. */
export const goal: (name: Goal) => void = analytics.goal;
