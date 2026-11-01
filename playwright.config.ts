import { defineConfig, devices } from "@playwright/test";

// Playwright строго 1.52.0: под эту версию скачан WebKit (ms-playwright/webkit-2158).
// Chromium не скачан — Chrome-проекты идут через системный Chrome (channel: "chrome").
const PORT = 4173;
const ORIGIN = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"]],
  outputDir: "test-results",
  use: {
    baseURL: `${ORIGIN}/diva_nails/`,
    trace: "retain-on-failure",
  },
  webServer: {
    // e2e идут против собранного dist/ через vite preview
    command: `npx vite build && npx vite preview --port ${PORT} --strictPort --host 127.0.0.1`,
    url: `${ORIGIN}/diva_nails/`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    { name: "iphone", use: { ...devices["iPhone 13"] } },
    { name: "android", use: { ...devices["Pixel 7"], channel: "chrome" } },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 900 } },
    },
  ],
});
