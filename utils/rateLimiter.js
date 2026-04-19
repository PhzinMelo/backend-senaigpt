/**
 * utils/rateLimiter.js
 *
 * In-memory sliding-window rate limiter.
 * No Redis required — works per-process.
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 });
 *   app.use("/ai", limiter);
 */

const logger = require("./logger");

/**
 * @typedef {object} RateLimiterOptions
 * @property {number} windowMs     - Time window in milliseconds (default: 60 000)
 * @property {number} maxRequests  - Max requests allowed per window (default: 10)
 * @property {string} [keyPrefix]  - Prefix for log context (default: "RateLimiter")
 */

/**
 * Creates an Express middleware that rate-limits per userId (from req.user).
 * Falls back to IP address if req.user is not available.
 *
 * @param {RateLimiterOptions} options
 * @returns {function} Express middleware
 */
const createRateLimiter = ({
  windowMs = 60_000,
  maxRequests = 10,
  keyPrefix = "RateLimiter",
} = {}) => {
  // Map<key, number[]> — stores timestamps of recent requests
  const store = new Map();

  // ── Periodic cleanup: remove stale entries every 5 minutes ────────────────
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    let removed = 0;
    for (const [key, timestamps] of store.entries()) {
      const fresh = timestamps.filter((t) => now - t < windowMs);
      if (fresh.length === 0) {
        store.delete(key);
        removed++;
      } else {
        store.set(key, fresh);
      }
    }
    if (removed > 0) {
      logger.debug(keyPrefix, "Rate limiter store cleaned", { removedKeys: removed });
    }
  }, 5 * 60_000);

  // Allow the interval to be garbage-collected if the process exits
  if (cleanupInterval.unref) cleanupInterval.unref();

  return (req, res, next) => {
    // ── Identify requester ─────────────────────────────────────────────────
    const userId = req.user?._id?.toString();
    const ip = req.ip || req.connection?.remoteAddress || "unknown";
    const key = userId ? `user:${userId}` : `ip:${ip}`;

    const now = Date.now();
    const windowStart = now - windowMs;

    // ── Get and filter timestamps within the current window ────────────────
    const timestamps = (store.get(key) || []).filter((t) => t > windowStart);

    if (timestamps.length >= maxRequests) {
      const oldestInWindow = timestamps[0];
      const retryAfterMs = Math.ceil(windowMs - (now - oldestInWindow));
      const retryAfterSec = Math.ceil(retryAfterMs / 1000);

      logger.warn(keyPrefix, "Rate limit exceeded", {
        key,
        requests: timestamps.length,
        maxRequests,
        retryAfterSec,
      });

      res.set("Retry-After", String(retryAfterSec));
      res.set("X-RateLimit-Limit", String(maxRequests));
      res.set("X-RateLimit-Remaining", "0");
      res.set("X-RateLimit-Reset", String(Math.ceil((windowStart + windowMs) / 1000)));

      return res.status(429).json({
        success: false,
        error: `Too many requests. You have reached the limit of ${maxRequests} requests per ${Math.round(windowMs / 1000)} seconds. Please try again in ${retryAfterSec} second(s).`,
      });
    }

    // ── Record this request ────────────────────────────────────────────────
    timestamps.push(now);
    store.set(key, timestamps);

    
    const remaining = maxRequests - timestamps.length;
    res.set("X-RateLimit-Limit", String(maxRequests));
    res.set("X-RateLimit-Remaining", String(remaining));
    res.set("X-RateLimit-Reset", String(Math.ceil((windowStart + windowMs) / 1000)));

    next();
  };
};

module.exports = { createRateLimiter };
