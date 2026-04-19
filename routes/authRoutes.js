/**
 * routes/authRoutes.js
 *
 * Improvements applied:
 * - Rate limiter on register and login to prevent brute-force attacks
 *   (20 attempts per IP per 15 minutes)
 */

const express = require("express");
const router = express.Router();

const { register, login, getMe } = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware");
const { registerValidator, loginValidator } = require("../middlewares/validationMiddleware");
const { createRateLimiter } = require("../utils/rateLimiter");
const { RATE_LIMIT } = require("../config/constants");

// ── Rate limiter for auth routes (brute-force protection) ─────────────────────
const authRateLimiter = createRateLimiter({
  windowMs: RATE_LIMIT.AUTH_WINDOW_MS,
  maxRequests: RATE_LIMIT.AUTH_MAX_REQUESTS,
  keyPrefix: "AuthRateLimiter",
});

// POST /auth/register
router.post("/register", authRateLimiter, registerValidator, register);

// POST /auth/login
router.post("/login", authRateLimiter, loginValidator, login);

// GET /auth/me  (protected — no rate limit needed, JWT guards it)
router.get("/me", protect, getMe);

module.exports = router;
