const orders = new Map();
const NEXT = {
  pending: { status: 'preparing', label: 'Start preparing', color: '#38bdf8' },
  preparing: { status: 'ready', label: 'Mark as ready', color: '#22c55e' },
  ready: { status: 'served', label: 'Served', color: '#94a3b8' },
};

const minutesAgo = (iso) => Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000));
const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function advance(order) {
  const next = NEXT[order.status];
  if (!next) return;
  await fetch(`/api/orders/${order.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: next.status }),
  });
  // The UI updates when the server broadcasts "order:updated".
}

function render() {
  for (const status of Object.keys(NEXT)) document.getElementById(`col-${status}`).innerHTML = '';
  for (const order of orders.values()) {
    const column = document.getElementById(`col-${order.status}`);
    if (!column) continue; // served / cancelled orders leave the board
    const next = NEXT[order.status];
    const card = document.createElement('article');
    card.className = 'order-card';
    card.dataset.status = order.status;
    card.innerHTML = `
      <h3><span>Table ${order.table}</span><small>${minutesAgo(order.createdAt)} min</small></h3>
      <ul>${order.items.map((i) => `<li>${i.quantity}× ${escapeHtml(i.name)}</li>`).join('')}</ul>
      ${order.notes ? `<div class="notes">“${escapeHtml(order.notes)}”</div>` : ''}
      <button style="background:${next.color}">${next.label}</button>`;
    card.querySelector('button').addEventListener('click', () => advance(order));
    column.append(card);
  }
}

const socket = io();
socket.on('connect', () => document.getElementById('connection').classList.add('online'));
socket.on('disconnect', () => document.getElementById('connection').classList.remove('online'));
socket.on('orders:snapshot', (list) => {
  orders.clear();
  list.forEach((o) => orders.set(o.id, o));
  render();
});
socket.on('order:created', (order) => {
  orders.set(order.id, order);
  render();
});
socket.on('order:updated', (order) => {
  orders.set(order.id, order);
  render();
});

setInterval(render, 60_000); // refresh the "minutes ago" timers
