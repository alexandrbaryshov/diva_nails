// Картинка секции: <picture> с AVIF и WebP, ленивая загрузка; временное фото несёт чип «уточняется».
import { Pending } from "../components/Pending";
import { MEDIA, type MediaImage } from "../media/manifest";

export interface PhotoProps {
  /** ключ из src/media/manifest.ts */
  name: string;
  alt: string;
  /** подсказка браузеру, какая ширина нужна */
  sizes?: string;
  class?: string;
  /** true — не откладывать загрузку (просмотр на весь экран) */
  eager?: boolean;
}

/** Фото из манифеста; нет ключа — ничего (в данных media — строка, манифест строит `npm run media`). */
export function Photo({ name, alt, sizes = "(min-width: 900px) 33vw, 72vw", class: className, eager }: PhotoProps) {
  const img = (MEDIA as Record<string, MediaImage>)[name];
  if (!img) return null;
  return (
    <picture class={className}>
      <source type="image/avif" srcset={img.avif} sizes={sizes} />
      <source type="image/webp" srcset={img.webp} sizes={sizes} />
      <img src={img.src} alt={alt} width={img.width} height={img.height} loading={eager ? "eager" : "lazy"} decoding="async" />
    </picture>
  );
}

/** Чип на временном фото: настоящее пришлёт студия. */
export function StubChip() {
  return <Pending class="chip" />;
}