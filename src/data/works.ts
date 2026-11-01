import works from "../../data/works.json";

export interface Work {
  id: string;
  /** ключ картинки в src/media/manifest.ts */
  media: string;
  alt: string;
  /** true — временное фото, на нём чип «уточняется» */
  stub: boolean;
}

export const WORKS: readonly Work[] = works.items as unknown as readonly Work[];
