// @vitest-environment node
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, existsSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error — .mjs без типов
import { isPublic, exportPublic } from "../scripts/export-public.mjs";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "diva-export-test-"));
  const source = join(root, "source"); mkdirSync(source);
  const git = (cwd: string, ...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8" });
  git(source, "init", "-q"); git(source, "config", "user.name", "Test"); git(source, "config", "user.email", "test@example.invalid");
  writeFileSync(join(source, "index.html"), "original");
  git(source, "add", "."); git(source, "commit", "-qm", "fixture");
  return { root, source, git, target: join(root, "public") };
}

describe("защита папки выгрузки", () => {
  it.each(["assume-unchanged", "committed"])("не перезаписывает правки при чистом статусе Git: %s", (mode) => {
    const f = fixture(); exportPublic(f.target, f.source);
    if (mode === "assume-unchanged") f.git(f.target, "update-index", "--assume-unchanged", "index.html");
    writeFileSync(join(f.target, "index.html"), "user edit");
    if (mode === "committed") {
      f.git(f.target, "add", "index.html");
      f.git(f.target, "commit", "-qm", "user edit");
    }
    expect(f.git(f.target, "status", "--porcelain").trim()).toBe("");
    const marker = readFileSync(join(f.target, ".diva-nails-export.json"), "utf8");
    expect(() => exportPublic(f.target, f.source)).toThrow(/изменён/);
    expect(readFileSync(join(f.target, "index.html"), "utf8")).toBe("user edit");
    expect(readFileSync(join(f.target, ".diva-nails-export.json"), "utf8")).toBe(marker);
  });
  it("не переиспользует старый манифест без хешей", () => {
    const f = fixture(); exportPublic(f.target, f.source);
    const path = join(f.target, ".diva-nails-export.json");
    const marker = JSON.parse(readFileSync(path, "utf8"));
    marker.version = 1; delete marker.hashes;
    writeFileSync(path, JSON.stringify(marker));
    f.git(f.target, "add", "."); f.git(f.target, "commit", "-qm", "old manifest");
    expect(() => exportPublic(f.target, f.source)).toThrow(/манифест/);
    expect(readFileSync(join(f.target, "index.html"), "utf8")).toBe("original");
  });
  it("отказывает для предка и чужой непустой папки до изменений", () => {
    const f = fixture();
    expect(() => exportPublic(f.root, f.source)).toThrow();
    mkdirSync(f.target); writeFileSync(join(f.target, "mine.txt"), "keep");
    expect(() => exportPublic(f.target, f.source)).toThrow();
    expect(readFileSync(join(f.target, "mine.txt"), "utf8")).toBe("keep");
    expect(existsSync(join(f.target, ".git"))).toBe(false);
  });
  it("отказывает для алиаса исходника", () => {
    const f = fixture(); symlinkSync(f.source, f.target, "junction");
    expect(() => exportPublic(f.target, f.source)).toThrow();
    expect(readFileSync(join(f.source, "index.html"), "utf8")).toBe("original");
  });
  it("повторяет собственную выгрузку, но сохраняет пользовательские правки и посторонние файлы", () => {
    const f = fixture(); exportPublic(f.target, f.source);
    expect(readFileSync(join(f.target, "index.html"), "utf8")).toBe("original");
    exportPublic(f.target, f.source);
    writeFileSync(join(f.target, "index.html"), "user edit");
    expect(() => exportPublic(f.target, f.source)).toThrow();
    expect(readFileSync(join(f.target, "index.html"), "utf8")).toBe("user edit");
    writeFileSync(join(f.target, "index.html"), "original");
    writeFileSync(join(f.target, "mine.txt"), "keep");
    expect(() => exportPublic(f.target, f.source)).toThrow();
    expect(f.git(f.target, "ls-files")).not.toContain("mine.txt");
  });
});

describe("публичная копия для GitHub", () => {
  it("рабочие материалы и заметки не публикуются", () => {
    for (const p of [".autopilot/x/spec.md", ".impeccable/mocks/comp-1.png", "AGENTS.md", "CLAUDE.md", "promt diva nails.md"]) {
      expect(isPublic(p), p).toBe(false);
    }
  });

  it("сайт, тесты и workflow публикуются", () => {
    for (const p of ["src/App.tsx", "index.html", "public/og/main.png", ".github/workflows/pages.yml", "data/studio.json", "package.json"]) {
      expect(isPublic(p), p).toBe(true);
    }
  });

  it("копия лежит в .gitignore, workflow выкладывает dist/ при push в master", () => {
    expect(readFileSync(join(process.cwd(), ".gitignore"), "utf8")).toMatch(/^diva-nails-github\/$/m);
    const yml = readFileSync(join(process.cwd(), ".github/workflows/pages.yml"), "utf8");
    expect(yml).toMatch(/branches: \[master\]/);
    expect(yml).toMatch(/path: dist/);
    expect(yml).toMatch(/npm run check/);
  });
});
