/**
 * middlewares/authMiddleware.js
 *
 * Improvements applied:
 * - Structured logger replaces silent failure paths
 * - Logs suspicious activity (expired/invalid tokens) without leaking details
 * - Authentication errors never expose internal stack traces
 */

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const logger = require("../utils/logger");

const CONTEXT = "AuthMiddleware";

/**
 * Protects routes by validating the JWT token.
 * Attaches the authenticated user object to req.user.
 */
const protect = async (req, res, next) => {
  try {
    // ── 1. Extract token from Authorization header ─────────────────────────────
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.warn(CONTEXT, "Request with no or malformed Authorization header", {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
      });
      return res.status(401).json({
        success: false,
        error: "Access denied. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Access denied. Token is malformed.",
      });
    }

    // ── 2. Verify and decode token ─────────────────────────────────────────────
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        logger.warn(CONTEXT, "Expired token used", {
          method: req.method,
          url: req.originalUrl,
          ip: req.ip,
        });
        return res.status(401).json({
          success: false,
          error: "Token expired. Please log in again.",
        });
      }

      logger.warn(CONTEXT, "Invalid token rejected", {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        jwtError: err.name,
      });
      return res.status(401).json({
        success: false,
        error: "Invalid token. Please log in again.",
      });
    }

    // ── 3. Fetch user from DB (confirms user still exists) ────────────────────
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      logger.warn(CONTEXT, "Token valid but user no longer exists in DB", {
        decodedUserId: decoded.userId,
      });
      return res.status(401).json({
        success: false,
        error: "User belonging to this token no longer exists.",
      });
    }

    // ── 4. Attach user to request ──────────────────────────────────────────────
    req.user = user;
    next();

  } catch (error) {
    logger.error(CONTEXT, "Unexpected authentication error", error);
    return res.status(500).json({
      success: false,
      error: "Authentication error. Please try again.",
    });
  }
};

module.exports = { protect };
