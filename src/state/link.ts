// Ссылка на дизайн: #d=<base64url>. Сервер не нужен — всё состояние руки в адресе.
//
// Формат версии 1 (биты, старший вперёд):
//   8  версия (= 1)
//   1  рука (0 — её, 1 — его)      2  тон      1  вторая рука
//   3  форма (SHAPES)              2  длина (LENGTHS)
//   × 5 ногтей (большой → мизинец):
//     8  оттенок — idx из палитры, 0 — без покрытия
//     3  эффект (EFFECTS)          3  узор (PATTERNS)
//     1  есть второй оттенок  [+8  его idx]
//     2  декора (0..3), на каждый:
//        4 тип (idx декора)  4 u  4 v (клетки 0..15)  2 размер (DECOR_SCALES)  3 поворот (×45°)
//   хвост — нули до целого байта.
// Самый тяжёлый дизайн — 397 бит = 67 символов, вся ссылка — 118 из 120.
// Картинки (принт, референс) в ссылку не идут.

import { MONTH_PRESET } from "../data/designs";
import { DECOR, RETIRED_SHADES, SHADES, nearestShade, type DecorItem, type RetiredShade, type Shade } from "../data/palette";
import { STUDIO } from "../data/studio";
import {
  DECOR_CELLS,
  DECOR_ROT_STEP,
  DECOR_SCALES,
  EFFECTS,
  HANDS,
  LENGTHS,
  MAX_DECOR_PER_NAIL,
  PATTERNS,
  SHAPES,
  normalizeDesign,
  snapDecor,
  type Decor,
  type Design,
  type Nail,
  type Tone,
} from "./design";

export type LinkWarning = "unknown-shade" | "bad-link" | "old-version";

export const LINK_VERSION = 1;

export interface LinkCatalog {
  shades: readonly Shade[];
  /** снятые оттенки: по их цвету старые ссылки находят ближайший */
  retired: readonly RetiredShade[];
  decor: readonly DecorItem[];
}

export interface LinkCodec {
  encodeDesign(d: Design): string;
  decodeDesign(s: string): { design: Design; warnings: LinkWarning[] } | null;
}

// ── base64url ───────────────────────────────────────────────────────────────

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const ALPHABET_INDEX = new Map([...ALPHABET].map((c, i) => [c, i]));

function toBase64Url(bytes: Uint8Array): string {
  let out = "";
  let acc = 0;
  let bits = 0;
  for (const byte of bytes) {
    acc = (acc << 8) | byte;
    bits += 8;
    while (bits >= 6) {
      bits -= 6;
      out += ALPHABET[(acc >> bits) & 63];
    }
    acc &= (1 << bits) - 1;
  }
  if (bits > 0) out += ALPHABET[(acc << (6 - bits)) & 63];
  return out;
}

function fromBase64Url(s: string): Uint8Array | null {
  if (s.length === 0 || s.length % 4 === 1) return null;
  const bytes: number[] = [];
  let acc = 0;
  let bits = 0;
  for (const c of s) {
    const v = ALPHABET_INDEX.get(c);
    if (v === undefined) return null;
    acc = (acc << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((acc >> bits) & 255);
    }
    acc &= (1 << bits) - 1;
  }
  // лишние биты последнего символа обязаны быть нулями — иначе строку правили руками
  if (acc !== 0) return null;
  return Uint8Array.from(bytes);
}

// ── биты ────────────────────────────────────────────────────────────────────

class BitWriter {
  private bytes: number[] = [];
  private acc = 0;
  private bits = 0;

  write(value: number, width: number): void {
    for (let i = width - 1; i >= 0; i--) {
      this.acc = (this.acc << 1) | ((value >> i) & 1);
      this.bits++;
      if (this.bits === 8) {
        this.bytes.push(this.acc);
        this.acc = 0;
        this.bits = 0;
      }
    }
  }

  finish(): Uint8Array {
    if (this.bits > 0) this.bytes.push(this.acc << (8 - this.bits));
    return Uint8Array.from(this.bytes);
  }
}

class BitReader {
  private pos = 0;
  constructor(private readonly bytes: Uint8Array) {}

  read(width: number): number {
    if (this.pos + width > this.bytes.length * 8) throw new RangeError("короткая ссылка");
    let v = 0;
    for (let i = 0; i < width; i++) {
      const bit = (this.bytes[this.pos >> 3] >> (7 - (this.pos & 7))) & 1;
      v = (v << 1) | bit;
      this.pos++;
    }
    return v;
  }

  /** Остаток — только нули добивки до целого байта. */
  clean(): boolean {
    const left = this.bytes.length * 8 - this.pos;
    if (left >= 8) return false;
    return left === 0 || this.read(left) === 0;
  }
}

function indexOrThrow<T>(list: readonly T[], value: T): number {
  const i = list.indexOf(value);
  if (i < 0) throw new RangeError(`нет значения ${String(value)}`);
  return i;
}

function valueOrThrow<T>(list: readonly T[], i: number): T {
  if (i >= list.length) throw new RangeError("значение вне формата");
  return list[i];
}

// ── кодек ───────────────────────────────────────────────────────────────────

export function createLinkCodec(catalog: LinkCatalog): LinkCodec {
  const shadeIdx = new Map(catalog.shades.map((s) => [s.id, s.idx]));
  const shadeByIdx = new Map(catalog.shades.map((s) => [s.idx, s]));
  const retiredByIdx = new Map(catalog.retired.map((s) => [s.idx, s]));
  const decorIdx = new Map(catalog.decor.map((d) => [d.id, d.idx]));
  const decorByIdx = new Map(catalog.decor.map((d) => [d.idx, d]));

  function encodeDesign(input: Design): string {
    const d = normalizeDesign(input);
    const w = new BitWriter();
    w.write(LINK_VERSION, 8);
    w.write(indexOrThrow(HANDS, d.hand), 1);
    w.write(d.tone, 2);
    w.write(d.twoHands ? 1 : 0, 1);
    w.write(indexOrThrow(SHAPES, d.shape), 3);
    w.write(indexOrThrow(LENGTHS, d.length), 2);
    for (const n of d.nails) {
      w.write(n.shade === null ? 0 : (shadeIdx.get(n.shade) ?? 0), 8);
      w.write(indexOrThrow(EFFECTS, n.effect), 3);
      w.write(indexOrThrow(PATTERNS, n.pattern), 3);
      const accent = n.accent === null ? undefined : shadeIdx.get(n.accent);
      w.write(accent === undefined ? 0 : 1, 1);
      if (accent !== undefined) w.write(accent, 8);
      const decor = n.decor.filter((x) => decorIdx.has(x.item)).slice(0, MAX_DECOR_PER_NAIL);
      w.write(decor.length, 2);
      for (const raw of decor) {
        const x = snapDecor(raw);
        w.write(decorIdx.get(x.item) ?? 0, 4);
        w.write(Math.floor(x.u * DECOR_CELLS), 4);
        w.write(Math.floor(x.v * DECOR_CELLS), 4);
        w.write(indexOrThrow(DECOR_SCALES, x.scale), 2);
        w.write(x.rot / DECOR_ROT_STEP, 3);
      }
    }
    return toBase64Url(w.finish());
  }

  function decodeDesign(s: string): { design: Design; warnings: LinkWarning[] } | null {
    const bytes = fromBase64Url(s);
    if (!bytes) return null;
    const warnings = new Set<LinkWarning>();
    try {
      const r = new BitReader(bytes);
      if (r.read(8) !== LINK_VERSION) return null;
      const hand = valueOrThrow(HANDS, r.read(1));
      const tone = r.read(2) as Tone;
      const twoHands = r.read(1) === 1;
      const shape = valueOrThrow(SHAPES, r.read(3));
      const length = valueOrThrow(LENGTHS, r.read(2));
      const pool = catalog.shades.filter((x) => (hand === "his" ? x.forHis : !x.forHis));

      const resolveShade = (idx: number): string | null => {
        if (idx === 0) return null;
        const known = shadeByIdx.get(idx);
        if (known) return known.id;
        warnings.add("unknown-shade");
        const retired = retiredByIdx.get(idx);
        return retired && pool.length > 0 ? nearestShade(retired.hex, pool).id : null;
      };

      const nails: Nail[] = [];
      for (let i = 0; i < 5; i++) {
        const shade = resolveShade(r.read(8));
        const effect = valueOrThrow(EFFECTS, r.read(3));
        const pattern = valueOrThrow(PATTERNS, r.read(3));
        let accent: string | null = null;
        if (r.read(1) === 1) {
          const idx = r.read(8);
          if (idx === 0) return null;
          accent = resolveShade(idx);
        }
        const count = r.read(2);
        if (count > MAX_DECOR_PER_NAIL) return null;
        const decor: Decor[] = [];
        for (let j = 0; j < count; j++) {
          const item = decorByIdx.get(r.read(4));
          const u = (r.read(4) + 0.5) / DECOR_CELLS;
          const v = (r.read(4) + 0.5) / DECOR_CELLS;
          const scale = valueOrThrow(DECOR_SCALES, r.read(2));
          const rot = r.read(3) * DECOR_ROT_STEP;
          // декор, которого больше нет в студии, просто не показываем
          if (item) decor.push({ item: item.id, u, v, scale, rot });
        }
        nails.push({ shade, effect, pattern, accent, decor });
      }
      if (!r.clean()) return null;
      const design = normalizeDesign({
        v: 1,
        hand,
        tone,
        twoHands,
        shape,
        length,
        nails: nails as Design["nails"],
      });
      return { design, warnings: [...warnings] };
    } catch {
      // короткая строка или значение вне формата — ссылка битая
      return null;
    }
  }

  return { encodeDesign, decodeDesign };
}

const codec = createLinkCodec({ shades: SHADES, retired: RETIRED_SHADES, decor: DECOR });

export const encodeDesign: (d: Design) => string = codec.encodeDesign;
export const decodeDesign: (s: string) => { design: Design; warnings: LinkWarning[] } | null = codec.decodeDesign;

/** STUDIO.siteUrl + "d/#d=" + код — страница со своим превью для мессенджеров. */
export function designUrl(d: Design): string {
  return `${STUDIO.siteUrl}d/#d=${encodeDesign(d)}`;
}

function linkCode(hash: string): string | null {
  return new URLSearchParams(hash.replace(/^#/, "")).get("d");
}

/**
 * Дизайн из адреса. Нет #d= — null. Битая ссылка или ссылка другой версии —
 * дизайн месяца и пометка «bad-link» / «old-version».
 */
export function readDesignFromLocation(loc: Location): { design: Design; warnings: LinkWarning[] } | null {
  const code = linkCode(loc.hash ?? "");
  if (code === null) return null;
  const decoded = decodeDesign(code);
  if (decoded) return decoded;
  const bytes = fromBase64Url(code);
  const otherVersion = bytes !== null && bytes.length > 0 && bytes[0] !== LINK_VERSION;
  return { design: MONTH_PRESET.design, warnings: [otherVersion ? "old-version" : "bad-link"] };
}

/** Пишет дизайн в адрес (#d=…) без новой записи в истории браузера. */
export function writeDesignToLocation(d: Design): void {
  const url = `${location.pathname}${location.search}#d=${encodeDesign(d)}`;
  history.replaceState(history.state, "", url);
}
