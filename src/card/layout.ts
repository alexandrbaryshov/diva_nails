// Раскладка карточки-брифа 1080×1920. Без импортов: числа читает и сборка карточки, и тест QR.
export const CARD_W = 1080;
export const CARD_H = 1920;
export const MARGIN = 72;

/** Рука (или две) — вписана в эту рамку. */
export const HAND_BOX = { x: MARGIN, y: 214, w: CARD_W - 2 * MARGIN, h: 800 };
/** Строки «палец — что на нём». */
export const LINES = { titleY: 1112, firstY: 1176, step: 62, textX: 330, maxW: CARD_W - MARGIN - 330 };
export const SHAPE_Y = 1520;
/** Нижний ряд: референс, место под промокод, QR. */
export const BOTTOM_Y = 1566;
export const REF_BOX = { x: MARGIN, y: BOTTOM_Y, size: 232 };
export const PROMO_BOX = { y: BOTTOM_Y, h: 232 };
/** QR вместе с белыми полями (quiet модулей с каждой стороны). */
export const QR_BOX = { x: 744, y: BOTTOM_Y - 24, size: 264, quiet: 2 };

/** Размер модуля QR целым числом пикселей и левый верхний угол первого модуля. */
export function qrGeometry(modules: number): { module: number; x0: number; y0: number } {
  const module = Math.floor(QR_BOX.size / (modules + 2 * QR_BOX.quiet));
  const used = module * modules;
  return {
    module,
    x0: QR_BOX.x + Math.floor((QR_BOX.size - used) / 2),
    y0: QR_BOX.y + Math.floor((QR_BOX.size - used) / 2),
  };
}
