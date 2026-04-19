/**
 * routes/aiRoutes.js
 *
 * - /ai/chat      → requires chatId (existing chat) + message
 * - /ai/chat/new  → requires only message (chat created on-the-fly)
 * - Rate limited: 10 req/min per user on both routes
 */

const express = require("express");
const router = express.Router();

const { aiChat, aiChatNew } = require("../controllers/aiController");
const { protect } = require("../middlewares/authMiddleware");
const {
  aiChatValidator,
  aiChatNewValidator,
} = require("../middlewares/validationMiddleware");
const { createRateLimiter } = require("../utils/rateLimiter");

// ── Rate limiter: 10 AI requests per user per minute ──────────────────────────
const aiRateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
  keyPrefix: "AiRateLimiter",
});

// All AI routes require authentication
router.use(protect);

// POST /ai/chat — Send message to AI in an existing chat (with history context)
router.post("/chat", aiRateLimiter, aiChatValidator, aiChat);

// POST /ai/chat/new — Create a new chat and send first message in one step
router.post("/chat/new", aiRateLimiter, aiChatNewValidator, aiChatNew);

module.exports = router;
