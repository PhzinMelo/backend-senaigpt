/**
 * middlewares/errorMiddleware.js
 *
 * Improvements applied:
 * - Uses structured logger instead of raw console.error
 * - Logs include route, method, and status code
 */

const logger = require("../utils/logger");

const CONTEXT = "ErrorMiddleware";

/**
 * 404 Not Found — for unmatched routes.
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * Global error handler — catches all errors passed via next(error).
 * Responds with a consistent JSON structure and never leaks stack traces
 * to the client in production.
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // ── Mongoose Validation Error ──────────────────────────────────────────────
  if (err.name === "ValidationError") {
    statusCode = 400;
    const errors = Object.values(err.errors).map((e) => e.message);
    message = errors.join(". ");
  }

  // ── Mongoose Duplicate Key (e.g., duplicate email) ─────────────────────────
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message = `${field} already exists.`;
  }

  // ── Mongoose CastError (invalid ObjectId) ─────────────────────────────────
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid value for field: ${err.path}`;
  }

  // ── Log every error with context ───────────────────────────────────────────
  const logMeta = {
    method: req.method,
    url: req.originalUrl,
    statusCode,
  };

  if (statusCode >= 500) {
    logger.error(CONTEXT, message, { ...logMeta, stack: err.stack });
  } else {
    logger.warn(CONTEXT, message, logMeta);
  }

  const isDev = process.env.NODE_ENV === "development";

  return res.status(statusCode).json({
    success: false,
    error: message,
    ...(isDev && err.stack ? { stack: err.stack } : {}),
  });
};

module.exports = { notFound, errorHandler };
