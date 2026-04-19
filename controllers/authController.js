/**
 * controllers/authController.js
 *
 * Improvements applied:
 * - Structured logs for register/login (never logs password or token)
 * - Consistent error handling for edge cases
 */

const User = require("../models/User");
const { generateToken } = require("../services/tokenService");
const logger = require("../utils/logger");

const CONTEXT = "AuthController";

/**
 * @desc    Register a new user
 * @route   POST /auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    logger.info(CONTEXT, "Register attempt", { email });

    // ── Check if email is already taken ───────────────────────────────────────
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      logger.warn(CONTEXT, "Register failed — email already exists", { email });
      return res.status(409).json({
        success: false,
        error: "Email is already registered.",
      });
    }

    // ── Create user (password hashed via pre-save hook in model) ──────────────
    const user = await User.create({ email, password });

    // ── Generate JWT (never log the token) ────────────────────────────────────
    const token = generateToken(user._id);

    logger.info(CONTEXT, "User registered successfully", {
      userId: String(user._id),
      email: user.email,
    });

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          _id: user._id,
          email: user.email,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    logger.error(CONTEXT, "Error during register", error);
    next(error);
  }
};

/**
 * @desc    Login existing user
 * @route   POST /auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    logger.info(CONTEXT, "Login attempt", { email });

    // ── Fetch user with password (select: false by default) ───────────────────
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      logger.warn(CONTEXT, "Login failed — user not found", { email });
      return res.status(401).json({
        success: false,
        error: "Invalid email or password.",
      });
    }

    // ── Compare passwords ─────────────────────────────────────────────────────
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      logger.warn(CONTEXT, "Login failed — wrong password", { email });
      return res.status(401).json({
        success: false,
        error: "Invalid email or password.",
      });
    }

    // ── Generate JWT ──────────────────────────────────────────────────────────
    const token = generateToken(user._id);

    logger.info(CONTEXT, "User logged in successfully", {
      userId: String(user._id),
      email: user.email,
    });

    return res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          _id: user._id,
          email: user.email,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    logger.error(CONTEXT, "Error during login", error);
    next(error);
  }
};

/**
 * @desc    Get current authenticated user profile
 * @route   GET /auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    logger.debug(CONTEXT, "GetMe request", { userId: String(req.user._id) });

    return res.status(200).json({
      success: true,
      data: {
        user: {
          _id: req.user._id,
          email: req.user.email,
          createdAt: req.user.createdAt,
        },
      },
    });
  } catch (error) {
    logger.error(CONTEXT, "Error in getMe", error);
    next(error);
  }
};

module.exports = { register, login, getMe };
