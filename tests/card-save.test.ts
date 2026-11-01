import { afterEach, describe, expect, it, vi } from "vitest";
import { saveCard } from "../src/card/save";

const blob = new Blob(["png"], { type: "image/png" });

function setNav(patch: Record<string, unknown>) {
  for (const [k, v] of Object.entries(patch)) Object.defineProperty(navigator, k, { value: v, configurable: true });
}

afterEach(() => {
  delete (navigator as unknown as Record<string, unknown>).share;
  delete (navigator as unknown as Record<string, unknown>).canShare;
});

describe("saveCard — в галерею", () => {
  it("canShare({files}) → share с файлом", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    setNav({ share, canShare: () => true });
    expect(await saveCard(blob, "card.png")).toBe("shared");
    const arg = share.mock.calls[0][0] as { files: File[] };
    expect(arg.files[0].name).toBe("card.png");
    expect(arg.files[0].type).toBe("image/png");
  });

  it("закрыла «Поделиться» — cancelled, скачивания нет", async () => {
    setNav({ share: vi.fn().mockRejectedValue(new DOMException("x", "AbortError")), canShare: () => true });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    expect(await saveCard(blob, "card.png")).toBe("cancelled");
    expect(click).not.toHaveBeenCalled();
  });

  it("нет share с файлами — скачивание <a download>", async () => {
    URL.createObjectURL = vi.fn(() => "blob:x");
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    expect(await saveCard(blob, "card.png")).toBe("downloaded");
    expect(click).toHaveBeenCalledOnce();
  });

  it("нет и скачивания — fallback (полноэкранная картинка)", async () => {
    const desc = Object.getOwnPropertyDescriptor(HTMLAnchorElement.prototype, "download");
    delete (HTMLAnchorElement.prototype as unknown as Record<string, unknown>).download;
    try {
      expect(await saveCard(blob, "card.png")).toBe("fallback");
    } finally {
      if (desc) Object.defineProperty(HTMLAnchorElement.prototype, "download", desc);
    }
  });
});
