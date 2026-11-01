// npm run e2e [-- аргументы playwright test]
//
// Playwright закреплён на 1.52.0 (под него скачан WebKit). Его ESM-загрузчик TypeScript
// зависает на Node 24 в пакете с "type": "module", поэтому он выключен (PW_DISABLE_TS_ESM),
// а playwright.config.ts и e2e/*.spec.ts грузит сам Node — встроенным снятием типов.
// Следствие: в e2e только «стираемый» TypeScript (без enum и т. п.), локальные .ts — с расширением.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const cli = fileURLToPath(new URL("../node_modules/@playwright/test/cli.js", import.meta.url));
const child = spawn(process.execPath, [cli, "test", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, PW_DISABLE_TS_ESM: "1" },
});
child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
