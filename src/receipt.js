import net from 'node:net';

const WIDTH = 42; // characters per line on a standard 80mm thermal printer

// ESC/POS control sequences
const ESC = '\x1b';
const GS = '\x1d';
export const ESC_POS = {
  init: `${ESC}@`,
  boldOn: `${ESC}E\x01`,
  boldOff: `${ESC}E\x00`,
  center: `${ESC}a\x01`,
  left: `${ESC}a\x00`,
  cut: `${GS}V\x00`,
};

const euro = (cents) => `${(cents / 100).toFixed(2).replace('.', ',')} €`;

function row(left, right) {
  const space = Math.max(1, WIDTH - left.length - right.length);
  return `${left}${' '.repeat(space)}${right}`.slice(0, WIDTH);
}

/** Builds a plain-text kitchen/customer receipt (42 columns). */
export function formatReceipt(order, { restaurantName = 'Demo Bistro' } = {}) {
  const divider = '-'.repeat(WIDTH);
  const lines = [
    restaurantName.toUpperCase(),
    `Table ${order.table} · Order ${order.id.slice(0, 8)}`,
    new Date(order.createdAt).toLocaleString('de-DE'),
    divider,
    ...order.items.map((i) => row(`${i.quantity}x ${i.name}`.slice(0, 30), euro(i.priceCents * i.quantity))),
    divider,
    row('Total', euro(order.totalCents)),
    row('incl. VAT', euro(order.vatCents)),
  ];
  if (order.notes) lines.push(divider, `Notes: ${order.notes}`);
  return lines.join('\n');
}

/** Wraps the receipt text in ESC/POS commands ready to be sent to a printer. */
export function toEscPos(text) {
  const [title, ...rest] = text.split('\n');
  return [
    ESC_POS.init,
    ESC_POS.center, ESC_POS.boldOn, title, ESC_POS.boldOff, '\n',
    ESC_POS.left, rest.join('\n'), '\n\n\n',
    ESC_POS.cut,
  ].join('');
}

/**
 * Sends a receipt to a network thermal printer (RAW/JetDirect on port 9100).
 * When no printer is configured the receipt is logged instead, so the demo works anywhere.
 */
export function printReceipt(order, { host, port = 9100, timeoutMs = 3000, logger = console } = {}) {
  const text = formatReceipt(order);
  if (!host) {
    logger.log(`\n[printer:simulated]\n${text}\n`);
    return Promise.resolve({ printed: false, simulated: true });
  }
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port }, () => {
      socket.end(Buffer.from(toEscPos(text), 'latin1'));
    });
    socket.setTimeout(timeoutMs, () => socket.destroy(new Error('printer timeout')));
    socket.on('close', (hadError) => !hadError && resolve({ printed: true, simulated: false }));
    socket.on('error', reject);
  });
}
