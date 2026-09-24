import { total } from './cart.mjs';
export const capture = (gateway, lines) => gateway.charge(total(lines));
