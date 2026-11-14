import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatReceipt, toEscPos, printReceipt, ESC_POS } from '../src/receipt.js';

const order = {
  id: '1234567890abcdef',
  table: 3,
  items: [{ name: 'Classic Burger', priceCents: 1450, quantity: 2 }],
  notes: 'No onions',
  totalCents: 2900,
  vatCents: 463,
  createdAt: '2026-01-15T12:00:00.000Z',
};

test('receipt lines fit an 80mm printer (42 columns)', () => {
  const text = formatReceipt(order);
  for (const line of text.split('\n')) assert.ok(line.length <= 42, `too long: "${line}"`);
  assert.match(text, /2x Classic Burger/);
  assert.match(text, /29,00 €/);
  assert.match(text, /Notes: No onions/);
});

test('ESC/POS output starts with init and ends with paper cut', () => {
  const raw = toEscPos(formatReceipt(order));
  assert.ok(raw.startsWith(ESC_POS.init));
  assert.ok(raw.endsWith(ESC_POS.cut));
});

test('printing is simulated when no printer host is configured', async () => {
  const logs = [];
  const result = await printReceipt(order, { logger: { log: (m) => logs.push(m) } });
  assert.deepEqual(result, { printed: false, simulated: true });
  assert.equal(logs.length, 1);
});
