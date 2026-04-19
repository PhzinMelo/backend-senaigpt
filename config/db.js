/**
 * config/db.js
 */

const mongoose = require("mongoose");
const logger   = require("../utils/logger");

const CONTEXT = "MongoDB";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: "ai-chat-db",
    });

    logger.info(CONTEXT, "Conexão estabelecida", { host: conn.connection.host });

    mongoose.connection.on("error",        (err) => logger.error(CONTEXT, "Erro de conexão", err));
    mongoose.connection.on("disconnected", ()    => logger.warn(CONTEXT, "Desconectado — reconectando..."));
    mongoose.connection.on("reconnected",  ()    => logger.info(CONTEXT, "Reconectado com sucesso"));

  } catch (error) {
    logger.error(CONTEXT, "Falha ao conectar", error);
    process.exit(1);
  }
};

module.exports = connectDB;
