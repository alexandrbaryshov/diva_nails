// QR на клиенте (uqr, без зависимостей): матрица модулей, true — тёмный.
import { encode } from "uqr";

export function qrMatrix(text: string): boolean[][] {
  return encode(text, { ecc: "M", border: 0 }).data;
}
