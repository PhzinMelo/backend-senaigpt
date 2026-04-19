/**
 * config/constants.js
 *
 * Single source of truth for all magic numbers and fixed values.
 * Import from here instead of hardcoding values in controllers/services.
 */

module.exports = {
  // ── AI / Gemini ─────────────────────────────────────────────────────────────
  AI: {
    /** Number of previous messages sent as context to the AI model */
    HISTORY_CONTEXT_LIMIT: 20,

    /** Message returned to the user when the AI call fails entirely */
    FALLBACK_MESSAGE: "Desculpe, não consegui processar sua mensagem. Por favor, tente novamente.",

    /** Max tokens the model can output per response */
    MAX_OUTPUT_TOKENS: 8192,

    /** Sampling temperature (0 = deterministic, 1 = creative) */
    TEMPERATURE: 0.9,
  },

  // ── Rate Limiting ───────────────────────────────────────────────────────────
  RATE_LIMIT: {
    /** Time window for AI rate limiting (ms) */
    AI_WINDOW_MS: 60_000,

    /** Max AI requests per user within the window */
    AI_MAX_REQUESTS: 10,

    /** Time window for auth route rate limiting (ms) */
    AUTH_WINDOW_MS: 15 * 60_000, // 15 minutes

    /** Max login/register attempts per IP within the window */
    AUTH_MAX_REQUESTS: 20,
  },

  // ── Pagination ──────────────────────────────────────────────────────────────
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 50,
    MAX_LIMIT: 100,
  },

  // ── Validation ──────────────────────────────────────────────────────────────
  VALIDATION: {
    PASSWORD_MIN_LENGTH: 6,
    MESSAGE_MAX_LENGTH: 20_000,
    CHAT_TITLE_MAX_LENGTH: 200,
    AUTO_TITLE_MAX_LENGTH: 60,
  },

  // ── Message roles ───────────────────────────────────────────────────────────
  MESSAGE_ROLES: {
    USER: "user",
    AI: "ai",
  },

  // ── Default values ──────────────────────────────────────────────────────────
  DEFAULTS: {
    CHAT_TITLE: "New Chat",
    GEMINI_MODEL: "gemini-1.5-flash",
  },
};
