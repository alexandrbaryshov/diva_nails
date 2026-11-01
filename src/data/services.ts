import services from "../../data/services.json";
import type { HandKind } from "../state/design";

export interface ServiceItem {
  title: string;
  /** null — цена уточняется */
  price: string | null;
  /** null — длительность уточняется */
  duration: string | null;
}

export interface ServiceCategory {
  id: string;
  title: string;
  /** «Нарисовать в конструкторе» — с какой рукой открыть; null — кнопки нет */
  constructorHand: HandKind | null;
  /** null — прайс уточняется */
  items: ServiceItem[] | null;
}

export const SERVICES: readonly ServiceCategory[] = services.categories as unknown as readonly ServiceCategory[];
