const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const kafka = require('kafka-node');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const instanceId = Math.floor(Math.random() * 10000);

app.use(cors());
app.use(express.json());


// =====================================================
//              Conexión a la base de datos
// =====================================================
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err.stack);
  } else {
    console.log('Conexión exitosa a la base de datos');
    release(); // Liberar el cliente al pool
  }
});
// =====================================================


// =====================================================
//                Conexión con websocket
// =====================================================
io.on('connection', (socket) => {
  console.log('New client connected');
  socket.on('disconnect', () => console.log('Client disconnected'));
});
// =====================================================


// =====================================================
//                      Rutas backend
// =====================================================
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

app.get('/', (req, res) => {
  res.send(`Soy la instancia ${instanceId}`);
});
// =======================================


const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend con instancia ${instanceId} escuchando en puerto ${PORT}`);
});