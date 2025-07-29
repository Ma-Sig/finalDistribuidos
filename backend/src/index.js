const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const kafka = require("kafka-node");
const http = require("http");
const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const { authenticateToken } = require("./middleware/authJwt");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const instanceId = Math.floor(Math.random() * 10000);

// =====================================================
//              Configuración de logging
// =====================================================
const logsDir = path.join(__dirname, "../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFile = path.join(logsDir, "backend.log");

function writeLog(level, message, metadata = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    instanceId,
    ...metadata,
  };

  // Escribir al archivo para que el sidecar lo capture
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + "\n");

  // También mostrar en consola para debugging local
  console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
}
// =====================================================

app.use(cors());
app.use(express.json());
// app.use(authenticateToken);

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
    console.error("Error al conectar a la base de datos:", err.stack);
    writeLog("error", "Error al conectar a la base de datos", {
      error: err.message,
    });
  } else {
    console.log("Conexión exitosa a la base de datos");
    writeLog("info", "Conexión exitosa a la base de datos");
    release(); // Liberar el cliente al pool
  }
});
// =====================================================

// =====================================================
//                Conexión con websocket
// =====================================================
io.on("connection", (socket) => {
  console.log("New client connected");
  writeLog("info", "New WebSocket client connected", { socketId: socket.id });
  socket.on("disconnect", () => {
    console.log("Client disconnected");
    writeLog("info", "WebSocket client disconnected", { socketId: socket.id });
  });
});
// =====================================================

// =====================================================
//              Configurar Kafka Producer
// =====================================================
const kafkaClient = new kafka.KafkaClient({ kafkaHost: "kafka:9092" });
const producer = new kafka.Producer(kafkaClient);

producer.on("ready", () => {
  console.log("Kafka Producer está listo");
  writeLog("info", "Kafka Producer está listo");
});

producer.on("error", (err) => {
  console.error("Error en Kafka Producer:", err);
  writeLog("error", "Error en Kafka Producer", { error: err.message });
});
// =====================================================

// =====================================================
//                      Rutas backend
// =====================================================
// Crear productor
app.post("/productores", authenticateToken, async (req, res) => {
  const { id, nombre } = req.body;
  writeLog("info", "Creando nuevo productor", { id, nombre });
  try {
    await pool.query("INSERT INTO productor (id, nombre) VALUES ($1, $2)", [
      id,
      nombre,
    ]);
    writeLog("info", "Productor creado exitosamente", { id, nombre });
    res.status(201).json({ message: "Productor creado" });
  } catch (error) {
    writeLog("error", "Error al crear productor", {
      error: error.message,
      id,
      nombre,
    });
    res.status(500).json({ error: error.message });
  }
});

// Listar productores
app.get("/productores", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM productor");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear pedido y enviarlo por Kafka
app.post("/pedidos", authenticateToken, async (req, res) => {
  const { nombre, productor_id } = req.body;
  writeLog("info", "Procesando nuevo pedido", { nombre, productor_id });

  try {
    const insertRes = await pool.query(
      "INSERT INTO pedido (nombre, productor_id) VALUES ($1, $2) RETURNING *",
      [nombre, productor_id]
    );

    const pedido = insertRes.rows[0];
    const message = `${productor_id}:${nombre}`;

    writeLog("info", "Pedido guardado en base de datos", {
      pedidoId: pedido.id,
      nombre,
      productor_id,
    });

    // Enviar mensaje a Kafka
    producer.send(
      [{ topic: "pedidos_comida", messages: [message] }],
      (err, data) => {
        if (err) {
          console.error("Error al enviar a Kafka:", err);
          writeLog("error", "Error al enviar pedido a Kafka", {
            error: err.message,
            pedidoId: pedido.id,
          });
          return res
            .status(500)
            .json({ error: "Error al enviar pedido a Kafka" });
        }

        writeLog("info", "Pedido enviado a Kafka exitosamente", {
          pedidoId: pedido.id,
          topic: "pedidos_comida",
          message,
        });

        // Notificar a través de WebSocket que hay un nuevo pedido
        io.emit("nuevo_pedido", pedido);
        writeLog("info", "Notificación WebSocket enviada", {
          pedidoId: pedido.id,
          event: "nuevo_pedido",
        });

        res.status(201).json({ message: "Pedido creado y enviado", pedido });
      }
    );
  } catch (error) {
    writeLog("error", "Error al procesar pedido", {
      error: error.message,
      nombre,
      productor_id,
    });
    res.status(500).json({ error: error.message });
  }
});

// Listar pedidos
app.get("/pedidos", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM pedido");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/", (req, res) => {
  res.send(`Soy la instancia ${instanceId}`);
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  writeLog("info", "Intento de login", { username });

  if (username === "admin" && password === "admin") {
    const payload = { username };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    writeLog("info", "Login exitoso", { username });
    return res.json({ token });
  }

  writeLog("warn", "Login fallido - credenciales incorrectas", { username });
  return res.status(401).json({ message: "Credenciales incorrectas" });
});
// =======================================

const PORT = 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Backend con instancia ${instanceId} escuchando en puerto ${PORT}`
  );
  writeLog("info", "Servidor iniciado", { port: PORT, instanceId });
});
