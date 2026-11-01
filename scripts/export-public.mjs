// Публичная копия без истории для GitHub: `node scripts/export-public.mjs [папка]` (по умолчанию diva-nails-github
// внутри проекта; в .gitignore, у неё свой git-репозиторий).
// Копирует файлы последнего коммита, кроме рабочих материалов автопилота и impeccable (isPublic),
// и коммитит их в отдельный git-репозиторий в этой папке (ветка master, создаётся при первом запуске).
// Публикуется он: push в его master → GitHub Pages (.github/workflows/pages.yml).
// Удаляет в копии только файлы, которые туда положила прошлая выгрузка и которых больше нет в проекте.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, rmSync, realpathSync, readdirSync, readFileSync, writeFileSync, lstatSync } from "node:fs";
import { dirname, join, resolve, relative, isAbsolute, parse } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/** Попадает ли файл проекта (путь от корня через «/») в публичную копию. */
export function isPublic(path) {
  // рабочие материалы автопилота и impeccable, заметки агентов и исходник заказчика — не публикуются
  if (path.startsWith(".autopilot/") || path.startsWith(".impeccable/")) return false;
  return path !== "AGENTS.md" && path !== "CLAUDE.md" && path !== "promt diva nails.md";
}

// stderr git (предупреждения про CRLF на каждый файл) не печатается — при ошибке он в тексте исключения
const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const tracked = (cwd) => git(cwd, "ls-files", "-z").split("\0").filter(Boolean);

const MARKER = ".diva-nails-export.json";
const fileHash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const canonical = (path) => realpathSync.native(path);
const inside = (parent, child) => { const rel = relative(parent, child); return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel)); };
function realDestination(path) {
  if (existsSync(path)) return canonical(path);
  const parent = dirname(path);
  return join(realDestination(parent), relative(parent, path));
}
function safeFile(root, file) {
  if (typeof file !== "string" || !file || file.includes("\\") || isAbsolute(file) || file.split("/").some((p) => p === ".." || p === ".git" || p === "")) throw new Error("Некорректный путь выгрузки");
  const path = resolve(root, file);
  if (!inside(root, path) || path === root) throw new Error("Путь вне выгрузки");
  let current = root;
  for (const part of file.split("/")) {
    current = join(current, part);
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) throw new Error("Ссылки внутри выгрузки запрещены");
  }
  return path;
}

export function exportPublic(target, source = ROOT) {
  source = canonical(source);
  target = realDestination(resolve(target));
  if (target === parse(target).root || inside(target, source)) throw new Error("Папка выгрузки — проект, его предок или корень диска");
  let previous = [];
  const populated = existsSync(target) && readdirSync(target).length > 0;
  if (populated) {
    const markerPath = safeFile(target, MARKER);
    if (!existsSync(markerPath)) throw new Error("Папка не является управляемой выгрузкой Diva Nails");
    const marker = JSON.parse(readFileSync(markerPath, "utf8"));
    if (marker.version !== 2 || marker.source !== source || !Array.isArray(marker.files) || !marker.hashes || typeof marker.hashes !== "object" || Array.isArray(marker.hashes)) throw new Error("Чужой, устаревший или повреждённый манифест — используй новую пустую папку");
    previous = marker.files;
    if (!existsSync(join(target, ".git")) || lstatSync(join(target, ".git")).isSymbolicLink() || !lstatSync(join(target, ".git")).isDirectory() || relative(canonical(git(target, "rev-parse", "--show-toplevel").trim()), target) !== "") throw new Error("Нужен собственный репозиторий выгрузки");
    if (git(target, "status", "--porcelain", "--untracked-files=all", "--ignored").trim()) throw new Error("В выгрузке пользовательские изменения или посторонние файлы");
    // Git может скрывать правки (assume-unchanged/skip-worktree) или считать
    // пользовательский коммит чистым. Истина — байты предыдущей выгрузки.
    // Весь preflight завершается до первого копирования или удаления.
    for (const old of previous) {
      const path = safeFile(target, old);
      if (!Object.hasOwn(marker.hashes, old) || !/^[a-f0-9]{64}$/.test(marker.hashes[old])) throw new Error("Повреждённый манифест хешей — используй новую пустую папку");
      if (!existsSync(path) || !lstatSync(path).isFile() || fileHash(path) !== marker.hashes[old]) throw new Error(`Файл выгрузки изменён: ${old}`);
    }
    const owned = new Set([...previous, MARKER]);
    if (tracked(target).some((file) => !owned.has(file))) throw new Error("В выгрузке чужие отслеживаемые файлы");
  }
  if (git(source, "status", "--porcelain", "--untracked-files=no").trim()) {
    throw new Error("В проекте незакоммиченные правки: выгружается последний коммит — сначала закоммить");
  }

  const files = tracked(source).filter(isPublic);
  if (files.includes(MARKER)) throw new Error("Исходник содержит служебный маркер выгрузки");
  for (const file of files) { safeFile(source, file); safeFile(target, file); }
  mkdirSync(target, { recursive: true });
  if (!existsSync(join(target, ".git"))) git(target, "init", "-b", "master");

  const keep = new Set(files);
  for (const old of previous) if (!keep.has(old)) rmSync(safeFile(target, old), { force: true });
  for (const file of files) {
    mkdirSync(dirname(join(target, file)), { recursive: true });
    copyFileSync(join(source, file), join(target, file));
  }

  const hashes = Object.fromEntries(files.map((file) => [file, fileHash(join(target, file))]));
  writeFileSync(join(target, MARKER), JSON.stringify({ version: 2, source, files, hashes }, null, 2) + "\n");
  git(target, "add", "-A", "--", ...new Set([...files, ...previous, MARKER]));
  if (!git(target, "status", "--porcelain").trim()) {
    console.log(`Без изменений: ${target}`);
    return;
  }
  const sha = git(source, "rev-parse", "--short", "HEAD").trim();
  git(target, "commit", "-q", "-m", `Сайт Diva Nails (исходный коммит ${sha})`);
  console.log(`Выгружено ${files.length} файлов в ${target}, коммит создан — осталось git push`);
}

const isCli = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isCli) exportPublic(resolve(ROOT, process.argv[2] ?? "diva-nails-github"));
