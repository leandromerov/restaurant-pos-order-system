import 'dotenv/config';
import { createPosServer } from './app.js';

const PORT = Number(process.env.PORT) || 3000;

const { server } = createPosServer({
  vatRate: Number(process.env.VAT_RATE) || 0.19,
  printer: { host: process.env.PRINTER_HOST, port: Number(process.env.PRINTER_PORT) || 9100 },
});

server.listen(PORT, () => {
  console.log(`POS running on http://localhost:${PORT}`);
  console.log(`Kitchen display: http://localhost:${PORT}/kitchen.html`);
});
