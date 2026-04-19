/**
 * utils/logger.js
 *
 * Lightweight structured logger.
 * - Never logs: passwords, tokens, API keys, full message content
 * - Always includes: timestamp, level, context
 * - Respects NODE_ENV: debug only in development
 */

const isDev = process.env.NODE_ENV !== "production";

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const CURRENT_LEVEL = isDev ? LEVELS.debug : LEVELS.info;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const timestamp = () => new Date().toISOString();

const truncate = (str, max = 120) => {
  if (typeof str !== "string") return str;
  return str.length > max ? `${str.slice(0, max)}…` : str;
};

const format = (level, context, message, meta = {}) => {
  const entry = {
    ts: timestamp(),
    level: level.toUpperCase(),
    context,
    message,
    ...meta,
  };
  return JSON.stringify(entry);
};

// ─── Redact sensitive keys from meta objects ──────────────────────────────────
const SENSITIVE_KEYS = new Set([
  "password", "token", "accessToken", "refreshToken",
  "apiKey", "api_key", "secret", "authorization", "cookie",
]);

const redact = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  const safe = {};
  for (const [k, v] of Object.entries(obj)) {
    safe[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? "[REDACTED]" : v;
  }
  return safe;
};

// ─── Logger factory ───────────────────────────────────────────────────────────

const logger = {
  /**
   * Log an informational message.
   * @param {string} context - e.g. "AuthController", "GeminiService"
   * @param {string} message - Human-readable message
   * @param {object} [meta]  - Extra structured data (will be redacted)
   */
  info(context, message, meta = {}) {
    if (CURRENT_LEVEL >= LEVELS.info) {
      console.log(format("info", context, message, redact(meta)));
    }
  },

  /**
   * Log a warning (non-fatal unexpected behavior).
   */
  warn(context, message, meta = {}) {
    if (CURRENT_LEVEL >= LEVELS.warn) {
      console.warn(format("warn", context, message, redact(meta)));
    }
  },

  /**
   * Log an error with optional Error object.
   * @param {string} context
   * @param {string} message
   * @param {Error|object} [err]
   */
  error(context, message, err = {}) {
    if (CURRENT_LEVEL >= LEVELS.error) {
      const meta = {
        errorMessage: err?.message || String(err),
        ...(isDev && err?.stack ? { stack: err.stack } : {}),
      };
      console.error(format("error", context, message, meta));
    }
  },

  /**
   * Log a debug message (development only).
   */
  debug(context, message, meta = {}) {
    if (CURRENT_LEVEL >= LEVELS.debug) {
      console.debug(format("debug", context, message, redact(meta)));
    }
  },

  /**
   * Log an AI interaction (summarized — never full message content in production).
   * @param {string} userId
   * @param {string} chatId
   * @param {string} userMessage
   * @param {string} aiResponse
   * @param {number} durationMs
   */
  aiInteraction(userId, chatId, userMessage, aiResponse, durationMs) {
    if (CURRENT_LEVEL >= LEVELS.info) {
      console.log(
        format("info", "GeminiService", "AI interaction completed", {
          userId: String(userId),
          chatId: String(chatId),
          userMessageLength: userMessage?.length ?? 0,
          userMessagePreview: isDev ? truncate(userMessage, 80) : "[hidden in production]",
          aiResponseLength: aiResponse?.length ?? 0,
          aiResponsePreview: isDev ? truncate(aiResponse, 80) : "[hidden in production]",
          durationMs,
        })
      );
    }
  },
};

module.exports = logger;
