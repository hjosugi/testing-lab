import { readFileSync } from 'node:fs';

export const SUBJECT_SOURCE = readFileSync(new URL('./subject.mjs', import.meta.url), 'utf8');

export const OPERATORS = Object.freeze([
  ['subtotal < 0', 'subtotal <= 0'],
  ['weightKg <= 0', 'weightKg < 0'],
  ["region === 'remote'", "region !== 'remote'"],
  ['fee = 1200', 'fee = 1100'],
  ['fee = 600', 'fee = 700'],
  ['weightKg > 10', 'weightKg >= 10'],
  ['(weightKg - 10) / 5', '(weightKg - 10) / 4'],
  ['Math.ceil(', 'Math.floor('],
  ['* 300', '* 200'],
  ['fee = fee * 2', 'fee = fee + 2'],
  ['member && subtotal >= 5000', 'member || subtotal >= 5000'],
  ['subtotal >= 5000', 'subtotal > 5000'],
  ['fee = 0', 'fee = 1'],
  ['subtotal >= 10000', 'subtotal > 10000'],
  ['Math.floor(fee / 2)', 'Math.ceil(fee / 2)'],
  ['fee / 2', 'fee / 3'],
]);

export async function loadMutants() {
  return Promise.all(OPERATORS.map(async ([from, to], index) => {
    const occurrences = SUBJECT_SOURCE.split(from).length - 1;
    if (occurrences < 1) throw new Error(`operator ${index} does not apply: ${from}`);
    const source = SUBJECT_SOURCE.replace(from, to);
    const module = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
    return { id: `M${String(index + 1).padStart(2, '0')}`, from, to, shippingFee: module.shippingFee };
  }));
}
