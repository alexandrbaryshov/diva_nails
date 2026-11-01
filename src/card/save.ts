// «В галерею»: Поделиться с файлом → скачивание → (вызывающий) полноэкранная картинка.

export type SaveResult = "shared" | "downloaded" | "fallback" | "cancelled";

export function cardFilename(date: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `diva-nails-${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}.png`;
}

export async function saveCard(blob: Blob, filename: string): Promise<SaveResult> {
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (typeof nav.share === "function" && typeof nav.canShare === "function" && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: "Мой маникюр — Diva Nails" });
      return "shared";
    } catch (e) {
      // закрыла «Поделиться» — ничего не потеряно; другая ошибка — пробуем скачать
      if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
    }
  }
  if (typeof document !== "undefined" && "download" in document.createElement("a")) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return "downloaded";
  }
  return "fallback";
}

