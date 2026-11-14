import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { MENU } from './menu.js';
import { createOrderStore, ValidationError } from './orders.js';
import { printReceipt } from './receipt.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const VAT_RATE = Number(process.env.VAT_RATE) || 0.19;
const PRINTER = { host: process.env.PRINTER_HOST, port: Number(process.env.PRINTER_PORT) || 9100 };

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const store = createOrderStore({ vatRate: VAT_RATE });

app.use(express.json({ limit: '50kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/api/menu', (_req, res) => res.json(MENU));
app.get('/api/orders', (req, res) => res.json(store.list({ activeOnly: req.query.active === 'true' })));

app.post('/api/orders', async (req, res, next) => {
  try {
    const order = store.create(req.body ?? {});
    io.emit('order:created', order);
    // Printing must never block or break order creation.
    printReceipt(order, PRINTER).catch((err) => console.error('Printer error:', err.message));
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

app.patch('/api/orders/:id/status', (req, res, next) => {
  try {
    const order = store.updateStatus(req.params.id, req.body?.status);
    if (!order) return res.status(404).json({ error: 'order not found' });
    io.emit('order:updated', order);
    res.json(order);
  } catch (err) {
    next(err);
  }
});

// Centralised error handling: validation errors -> 400, everything else -> 500.
app.use((err, _req, res, _next) => {
  if (err instanceof ValidationError) return res.status(400).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'internal server error' });
});

io.on('connection', (socket) => {
  socket.emit('orders:snapshot', store.list({ activeOnly: true }));
});

server.listen(PORT, () => {
  console.log(`POS running on http://localhost:${PORT}`);
  console.log(`Kitchen display: http://localhost:${PORT}/kitchen.html`);
});
