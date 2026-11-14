import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateTotals, createOrderStore, ValidationError } from '../src/orders.js';

test('calculateTotals extracts included VAT from gross prices', () => {
  const totals = calculateTotals([{ priceCents: 1190, quantity: 1 }], 0.19);
  assert.deepEqual(totals, { subtotalCents: 1190, vatCents: 190, totalCents: 1190 });
});

test('creates an order with priced lines and pending status', () => {
  const store = createOrderStore();
  const order = store.create({
    table: 4,
    items: [
      { menuItemId: 'main-schnitzel', quantity: 2 },
      { menuItemId: 'drink-beer', quantity: 2 },
    ],
  });
  assert.equal(order.status, 'pending');
  assert.equal(order.items.length, 2);
  assert.equal(order.totalCents, 2 * 1890 + 2 * 490);
});

test('rejects unknown items, invalid tables and empty orders', () => {
  const store = createOrderStore();
  assert.throws(() => store.create({ table: 1, items: [{ menuItemId: 'nope', quantity: 1 }] }), ValidationError);
  assert.throws(() => store.create({ table: 0, items: [{ menuItemId: 'drink-water', quantity: 1 }] }), ValidationError);
  assert.throws(() => store.create({ table: 2, items: [] }), ValidationError);
});

test('enforces the kitchen status workflow', () => {
  const store = createOrderStore();
  const { id } = store.create({ table: 7, items: [{ menuItemId: 'drink-coffee', quantity: 1 }] });
  assert.throws(() => store.updateStatus(id, 'served'), ValidationError);
  assert.equal(store.updateStatus(id, 'preparing').status, 'preparing');
  assert.equal(store.updateStatus(id, 'ready').status, 'ready');
  assert.equal(store.updateStatus(id, 'served').status, 'served');
  assert.equal(store.updateStatus('missing-id', 'ready'), null);
});

test('active list hides served and cancelled orders', () => {
  const store = createOrderStore();
  const a = store.create({ table: 1, items: [{ menuItemId: 'drink-water', quantity: 1 }] });
  store.create({ table: 2, items: [{ menuItemId: 'drink-water', quantity: 1 }] });
  store.updateStatus(a.id, 'cancelled');
  assert.equal(store.list().length, 2);
  assert.equal(store.list({ activeOnly: true }).length, 1);
});
