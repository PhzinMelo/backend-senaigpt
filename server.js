/**
 * server.js
 */

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const { errorHandler, notFound } = require("./middlewares/errorMiddleware");
const logger = require("./utils/logger");

const authRoutes    = require("./routes/authRoutes");
const chatRoutes    = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const aiRoutes      = require("./routes/aiRoutes");

const app  = express();
const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV !== "production";

// ─── Database ──────────────────────────────────────────────────────────────────
connectDB();

// ─── CORS ──────────────────────────────────────────────────────────────────────
// Development  → aceita qualquer origem (sem bloqueios durante desenvolvimento)
// Production   → aceita apenas FRONTEND_URL definida no .env
const corsOptions = isDev
  ? { origin: true, credentials: true }
  : {
      origin: process.env.FRONTEND_URL,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    };

app.use(cors(corsOptions));

// ─── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Request logger (sem dados sensíveis) ──────────────────────────────────────
app.use((req, _res, next) => {
  logger.debug("HTTP", `${req.method} ${req.originalUrl}`, { ip: req.ip });
  next();
});

// ─── Rota raiz — facilita testes no navegador e no Render ─────────────────────
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "API funcionando corretamente",
  });
});

// ─── Health check — status completo do servidor ────────────────────────────────
app.get("/health", (_req, res) => {
  // readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  const dbStates = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };
  const dbState  = mongoose.connection.readyState;

  res.status(200).json({
    success: true,
    data: {
      status:      "running",
      environment: process.env.NODE_ENV || "development",
      timestamp:   new Date().toISOString(),
      database: {
        status: dbStates[dbState] ?? "unknown",
        name:   mongoose.connection.name || null,
      },
    },
  });
});

// ─── Rotas da aplicação ────────────────────────────────────────────────────────
app.use("/auth",     authRoutes);
app.use("/chats",    chatRoutes);
app.use("/messages", messageRoutes);
app.use("/ai",       aiRoutes);

// ─── Error handling ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info("Server", "AI Chat Backend iniciado", {
    port:        PORT,
    environment: process.env.NODE_ENV || "development",
    cors:        isDev ? "all origins (dev)" : process.env.FRONTEND_URL,
    url:         `http://localhost:${PORT}`,
  });
});

// ─── Graceful shutdown ─────────────────────────────────────────────────────────
const shutdown = (signal) => {
  logger.info("Server", `${signal} recebido — encerrando graciosamente`);
  server.close(() => {
    logger.info("Server", "Servidor HTTP encerrado");
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error("Process", "Unhandled Promise Rejection", reason instanceof Error ? reason : new Error(String(reason)));
});

process.on("uncaughtException", (err) => {
  logger.error("Process", "Uncaught Exception — encerrando", err);
  process.exit(1);
});

module.exports = app;
