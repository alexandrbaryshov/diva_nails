// npm run media — растры из media-src/ → public/media/ (AVIF + WebP в нескольких ширинах)
// и src/media/manifest.ts с готовыми srcset для <picture>.
//
//   node scripts/media.mjs [--src=media-src] [--out=public/media] [--manifest=src/media/manifest.ts] [--widths=480,960,1440]
//
// Имя файла без расширения становится ключом: media-src/work-01.png → MEDIA["work-01"].
// Ширины больше исходной не делаются. Уже свежие файлы не пересобираются.
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.join("=")];
  }),
);
const SRC = resolve(ROOT, args.src || "media-src");
const OUT = resolve(ROOT, args.out || "public/media");
const MANIFEST = resolve(ROOT, args.manifest || "src/media/manifest.ts");
const WIDTHS = (args.widths || "480,960,1440").split(",").map(Number).filter((n) => n > 0).sort((a, b) => a - b);
const INPUT = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"]);

if (!existsSync(SRC)) {
  console.log(`media: нет ${relative(ROOT, SRC) || SRC} — нечего конвертировать`);
  process.exit(0);
}

const files = readdirSync(SRC)
  .filter((f) => INPUT.has(extname(f).toLowerCase()))
  .sort();
if (files.length === 0) {
  console.log(`media: в ${relative(ROOT, SRC)} нет картинок — нечего конвертировать`);
  process.exit(0);
}

mkdirSync(OUT, { recursive: true });
const fresh = (out, src) => existsSync(out) && statSync(out).mtimeMs >= statSync(src).mtimeMs;

const entries = [];
let written = 0;
for (const file of files) {
  const src = join(SRC, file);
  const key = basename(file, extname(file));
  if (!/^[a-z0-9][a-z0-9-]*$/.test(key)) {
    console.error(`media: ✗ ${file}: имя — только латиница в нижнем регистре, цифры и дефис`);
    process.exit(1);
  }
  const meta = await sharp(src).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const widths = WIDTHS.filter((w) => w < width);
  if (widths.length === 0 || widths[widths.length - 1] < width) widths.push(Math.min(width, WIDTHS[WIDTHS.length - 1] ?? width));
  const sizes = [...new Set(widths)].sort((a, b) => a - b);
  const variants = { avif: [], webp: [] };
  for (const w of sizes) {
    for (const format of ["avif", "webp"]) {
      const name = `${key}-${w}.${format}`;
      const out = join(OUT, name);
      if (!fresh(out, src)) {
        const img = sharp(src).resize({ width: w, withoutEnlargement: true });
        await (format === "avif" ? img.avif({ quality: 55, effort: 4 }) : img.webp({ quality: 78 })).toFile(out);
        written++;
      }
      variants[format].push([name, w]);
    }
  }
  entries.push({ key, width, height, ...variants });
}

// путь от public/ — то, что увидит браузер после base (public/media → "media")
const outParts = OUT.split(/[\\/]/);
const publicAt = outParts.lastIndexOf("public");
const urlBase = publicAt >= 0 ? outParts.slice(publicAt + 1).join("/") : basename(OUT);
const srcset = (list) => list.map(([name, w]) => `\${B}${urlBase}/${name} ${w}w`).join(", ");
const body = entries
  .map((e) => {
    const fallback = e.webp[Math.min(1, e.webp.length - 1)][0];
    return [
      `  ${JSON.stringify(e.key)}: {`,
      `    width: ${e.width},`,
      `    height: ${e.height},`,
      `    avif: \`${srcset(e.avif)}\`,`,
      `    webp: \`${srcset(e.webp)}\`,`,
      `    src: \`\${B}${urlBase}/${fallback}\`,`,
      `  },`,
    ].join("\n");
  })
  .join("\n");

const ts = `// Сгенерировано scripts/media.mjs (npm run media) — не править руками.
export interface MediaImage {
  /** исходные размеры — для width/height у <img> */
  width: number;
  height: number;
  /** srcset для <source type="image/avif"> */
  avif: string;
  /** srcset для <source type="image/webp"> */
  webp: string;
  /** src для <img> */
  src: string;
}

const B = import.meta.env.BASE_URL;

export const MEDIA = {
${body}
} satisfies Record<string, MediaImage>;

export type MediaKey = keyof typeof MEDIA;
`;

mkdirSync(dirname(MANIFEST), { recursive: true });
writeFileSync(MANIFEST, ts);
console.log(`media: ${entries.length} картин., записано файлов: ${written}; манифест — ${relative(ROOT, MANIFEST)}`);
