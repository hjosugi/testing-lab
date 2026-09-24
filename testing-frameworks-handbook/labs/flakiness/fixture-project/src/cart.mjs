import { yen } from './money.mjs';
export const total = lines => lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
export const label = lines => yen(total(lines));
