import "./styles/tokens.css";
import "./styles/fonts.css";
import "./styles/base.css";
import { hydrate, render } from "preact";
import { App } from "./App";
import { initAnalytics } from "./analytics";
import { bootFromLocation } from "./state/boot";
import { store } from "./state/store";

// В браузере: главная пришла пререндеренной — гидратируем тем же дизайном месяца,
// и только потом подставляем дизайн из #d=… (так разметка и состояние совпадают).
// d/ пререндера не имеет — рисуем с нуля.
if (typeof window !== "undefined") {
  const root = document.getElementById("app");
  if (root) {
    if (root.firstElementChild) hydrate(<App />, root);
    else render(<App />, root);
    initAnalytics();
    bootFromLocation(store, window.location);
  }
}

/** Пререндер главной при сборке (@preact/preset-vite). */
export async function prerender() {
  const { renderToString } = await import("preact-render-to-string");
  return { html: renderToString(<App />) };
}
