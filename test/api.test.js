// End-to-end tests of the REST API. Skipped automatically when dependencies
// are not installed (run `npm install` first).
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

let createPosServer;
try {
  ({ createPosServer } = await import('../src/app.js'));
} catch {
  createPosServer = null;
}

describe('REST API', { skip: !createPosServer && 'dependencies not installed' }, () => {
  let server;
  let baseUrl;
  const silent = { error() {}, log() {} };

  before(async () => {
    ({ server } = createPosServer({ logger: silent, printer: { logger: silent } }));
    await new Promise((resolve) => server.listen(0, resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(() => new Promise((resolve) => server.close(resolve)));

  const post = (path, body, method = 'POST') =>
    fetch(baseUrl + path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  test('GET /api/health', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.deepEqual(await res.json(), { status: 'ok' });
  });

  test('order lifecycle: create -> preparing -> ready', async () => {
    const created = await post('/api/orders', { table: 4, items: [{ menuItemId: 'starter-bruschetta', quantity: 2 }] });
    assert.equal(created.status, 201);
    const order = await created.json();
    assert.equal(order.status, 'pending');

    for (const status of ['preparing', 'ready']) {
      const res = await post(`/api/orders/${order.id}/status`, { status }, 'PATCH');
      assert.equal(res.status, 200);
      assert.equal((await res.json()).status, status);
    }

    const active = await (await fetch(`${baseUrl}/api/orders?active=true`)).json();
    assert.ok(active.some((o) => o.id === order.id));
  });

  test('invalid order returns 400', async () => {
    const res = await post('/api/orders', { table: 0, items: [] });
    assert.equal(res.status, 400);
    assert.ok((await res.json()).error);
  });

  test('invalid status transition returns 400 and unknown order 404', async () => {
    const order = await (await post('/api/orders', { table: 1, items: [{ menuItemId: 'starter-soup', quantity: 1 }] })).json();
    assert.equal((await post(`/api/orders/${order.id}/status`, { status: 'served' }, 'PATCH')).status, 400);
    assert.equal((await post('/api/orders/does-not-exist/status', { status: 'ready' }, 'PATCH')).status, 404);
  });
});
