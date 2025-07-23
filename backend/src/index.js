const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const kafka = require('kafka-node');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: 'user',
  host: 'db',
  database: 'sistema',
  password: 'password',
  port: 5432,
});

// Kafka producer setup
const Producer = kafka.Producer;
const client = new kafka.KafkaClient({ kafkaHost: 'kafka:9092' });
const producer = new Producer(client);

producer.on('ready', () => {
  console.log('Kafka Producer is connected and ready.');
});

producer.on('error', (err) => {
  console.error('Kafka Producer error:', err);
});

// WebSocket connection
io.on('connection', (socket) => {
  console.log('New client connected');
  socket.on('disconnect', () => console.log('Client disconnected'));
});

// Rutas backend

// Crear productor
app.post('/productores', async (req, res) => {
  const { id, nombre } = req.body;
  try {
    await pool.query('INSERT INTO productor (id, nombre) VALUES ($1, $2)', [id, nombre]);
    res.status(201).json({ message: 'Productor creado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar productores
app.get('/productores', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM productor');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear pedido y enviarlo por Kafka
app.post('/pedidos', async (req, res) => {
  const { nombre, productor_id } = req.body;

  try {
    const insertRes = await pool.query(
      'INSERT INTO pedido (nombre, productor_id) VALUES ($1, $2) RETURNING *',
      [nombre, productor_id]
    );

    const pedido = insertRes.rows[0];
    const message = `${productor_id}:${nombre}`;

    // Enviar mensaje a Kafka
    producer.send([{ topic: 'pedidos_comida', messages: [message] }], (err, data) => {
      if (err) {
        console.error('Error al enviar a Kafka:', err);
        return res.status(500).json({ error: 'Error al enviar pedido a Kafka' });
      }
      // Notificar a través de WebSocket que hay un nuevo pedido
      io.emit('nuevo_pedido', pedido);
      res.status(201).json({ message: 'Pedido creado y enviado', pedido });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar pedidos
app.get('/pedidos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pedido');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend escuchando en puerto ${PORT}`);
});