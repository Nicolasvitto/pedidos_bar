const express = require('express');
const path = require('path');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const orders = [];

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

app.post('/api/order', (req, res) => {
  const { table, items, notes } = req.body || {};
  const t = Number(table);
  const i = typeof items === 'string' ? items.trim() : '';
  const n = typeof notes === 'string' ? notes.trim() : '';
  if (!Number.isFinite(t) || t < 1 || !i) {
    return res.status(400).json({ error: 'Dados inválidos' });
  }
  const order = {
    id: genId(),
    table: t,
    items: i,
    notes: n,
    status: 'novo',
    createdAt: new Date().toISOString()
  };
  orders.unshift(order);
  io.emit('new-order', order);
  res.status(201).json(order);
});

app.get('/api/orders', (req, res) => {
  res.json(orders);
});

app.patch('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Pedido não encontrado' });
  const allowed = new Set(['novo', 'preparo', 'entregue']);
  if (typeof status !== 'string' || !allowed.has(status)) {
    return res.status(400).json({ error: 'status inválido' });
  }
  orders[idx].status = status;
  orders[idx].updatedAt = new Date().toISOString();
  io.emit('order-updated', orders[idx]);
  res.json(orders[idx]);
});

io.on('connection', () => {});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});
