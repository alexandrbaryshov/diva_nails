// Своя картинка — только в браузере: проверка, уменьшение до 1600 px, blob:-адрес.
// Никаких запросов в сеть: файл читается и перекодируется на месте.

export const NOT_IMAGE = "Это не картинка — выбери фото или скрин";
export const CANT_OPEN = "Не получилось открыть картинку — попробуй скрин или фото в JPEG";
/** Больше этой стороны фото уменьшается. */
export const MAX_SIDE = 1600;

export type PreparedImage = { ok: true; url: string; width: number; height: number } | { ok: false; error: string };

interface Decoded {
  width: number;
  height: number;
  source: CanvasImageSource;
  close(): void;
}

async function decode(file: Blob): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    const bmp = await createImageBitmap(file);
    return { width: bmp.width, height: bmp.height, source: bmp, close: () => bmp.close() };
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } finally {
    URL.revokeObjectURL(url);
  }
  return { width: img.naturalWidth, height: img.naturalHeight, source: img, close: () => {} };
}

const AS_IS = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/** Готовит картинку для ногтя или референса. Не картинка — понятная ошибка, большое фото — уменьшается. */
export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) return { ok: false, error: NOT_IMAGE };
  let img: Decoded;
  try {
    img = await decode(file);
  } catch {
    return { ok: false, error: CANT_OPEN };
  }
  try {
    const k = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
    if (k === 1 && AS_IS.has(file.type)) return { ok: true, url: URL.createObjectURL(file), width: img.width, height: img.height };
    const width = Math.max(1, Math.round(img.width * k));
    const height = Math.max(1, Math.round(img.height * k));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { ok: false, error: CANT_OPEN };
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img.source, 0, 0, width, height);
    const type = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, type, 0.9));
    if (!blob) return { ok: false, error: CANT_OPEN };
    return { ok: true, url: URL.createObjectURL(blob), width, height };
  } finally {
    img.close();
  }
}
