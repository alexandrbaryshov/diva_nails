import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import preact from "@preact/preset-vite";

const root = fileURLToPath(new URL(".", import.meta.url));

// Адрес сайта на GitHub Pages: https://alexandrbaryshov.github.io/diva-nails/
// (тот же адрес — data/studio.json → siteUrl).
export const BASE = "/diva-nails/";

export default defineConfig({
  base: BASE,
  plugins: [
    preact({
      // Prefresh нужен только в dev; в тестах он лишний.
      prefreshEnabled: !process.env.VITEST,
      // Пререндер главной: страница рисуется до JS и гидратируется.
      // d/ и privacy/ — отдельные входы сборки со своей разметкой (см. rollupOptions.input).
      prerender: {
        enabled: true,
        renderTarget: "#app",
      },
    }),
  ],
  build: {
    rollupOptions: {
      // Порядок важен: первый HTML — шаблон пререндера главной.
      input: {
        index: resolve(root, "index.html"),
        d: resolve(root, "d/index.html"),
        privacy: resolve(root, "privacy/index.html"),
      },
    },
  },
  preview: {
    host: "127.0.0.1",
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
    restoreMocks: true,
  },
});
