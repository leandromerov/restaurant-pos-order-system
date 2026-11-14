const euro = (cents) => `${(cents / 100).toFixed(2).replace('.', ',')} €`;
const $ = (id) => document.getElementById(id);

const cart = new Map(); // menuItemId -> { item, quantity }
let menu = [];

function toast(message, isError = false) {
  const el = $('toast');
  el.textContent = message;
  el.className = `toast show${isError ? ' error' : ''}`;
  setTimeout(() => (el.className = 'toast'), 2500);
}

function renderMenu() {
  const byCategory = Object.groupBy(menu, (item) => item.category);
  $('menu').innerHTML = '';
  for (const [category, items] of Object.entries(byCategory)) {
    const section = document.createElement('div');
    section.className = 'menu-category';
    section.innerHTML = `<h2>${category}</h2>`;
    const grid = document.createElement('div');
    grid.className = 'menu-grid';
    for (const item of items) {
      const btn = document.createElement('button');
      btn.className = 'menu-item';
      btn.innerHTML = `${item.name}<span>${euro(item.priceCents)}</span>`;
      btn.addEventListener('click', () => addToCart(item));
      grid.append(btn);
    }
    section.append(grid);
    $('menu').append(section);
  }
}

function addToCart(item) {
  const line = cart.get(item.id) ?? { item, quantity: 0 };
  line.quantity += 1;
  cart.set(item.id, line);
  renderCart();
}

function renderCart() {
  const list = $('lines');
  list.innerHTML = '';
  let total = 0;
  for (const [id, { item, quantity }] of cart) {
    total += item.priceCents * quantity;
    const li = document.createElement('li');
    li.innerHTML = `<span>${quantity}× ${item.name}</span><span>${euro(item.priceCents * quantity)} <button aria-label="Remove">✕</button></span>`;
    li.querySelector('button').addEventListener('click', () => {
      cart.delete(id);
      renderCart();
    });
    list.append(li);
  }
  $('total').textContent = euro(total);
  $('send').disabled = cart.size === 0;
}

async function sendOrder() {
  const payload = {
    table: Number($('table').value),
    notes: $('notes').value,
    items: [...cart.values()].map(({ item, quantity }) => ({ menuItemId: item.id, quantity })),
  };
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) return toast(data.error ?? 'Could not send order', true);
  cart.clear();
  $('notes').value = '';
  renderCart();
  toast(`Order for table ${data.table} sent to the kitchen`);
}

const socket = io();
socket.on('connect', () => $('connection').classList.add('online'));
socket.on('disconnect', () => $('connection').classList.remove('online'));
socket.on('order:updated', (order) => {
  if (order.status === 'ready') toast(`Table ${order.table}: order is ready to serve!`);
});

$('send').addEventListener('click', sendOrder);
menu = await (await fetch('/api/menu')).json();
renderMenu();
