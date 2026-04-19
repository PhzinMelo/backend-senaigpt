/**
 * middlewares/validationMiddleware.js
 */

const { body, param, query, validationResult } = require("express-validator");
const { VALIDATION } = require("../config/constants");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((e) => e.msg);
    return res.status(400).json({
      success: false,
      error: errorMessages.join(". "),
    });
  }
  next();
};

// ─── Auth ──────────────────────────────────────────────────────────────────────

const registerValidator = [
  body("email")
    .notEmpty().withMessage("Email is required.")
    .isEmail().withMessage("Please provide a valid email address.")
    .normalizeEmail(),

  body("password")
    .notEmpty().withMessage("Password is required.")
    .isLength({ min: VALIDATION.PASSWORD_MIN_LENGTH })
    .withMessage(`Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters long.`)
    .matches(/\d/).withMessage("Password must contain at least one number."),

  validate,
];

const loginValidator = [
  body("email")
    .notEmpty().withMessage("Email is required.")
    .isEmail().withMessage("Please provide a valid email address.")
    .normalizeEmail(),

  body("password")
    .notEmpty().withMessage("Password is required."),

  validate,
];

// ─── Chats ─────────────────────────────────────────────────────────────────────

const createChatValidator = [
  body("chatTitle")
    .optional()
    .isString().withMessage("chatTitle must be a string.")
    .trim()
    .isLength({ max: VALIDATION.CHAT_TITLE_MAX_LENGTH })
    .withMessage(`chatTitle cannot exceed ${VALIDATION.CHAT_TITLE_MAX_LENGTH} characters.`),

  validate,
];

const chatIdParamValidator = [
  param("id")
    .notEmpty().withMessage("Chat ID is required.")
    .isMongoId().withMessage("Invalid chat ID format."),

  validate,
];

// ─── Messages ──────────────────────────────────────────────────────────────────

const chatIdInParamValidator = [
  param("chatId")
    .notEmpty().withMessage("chatId is required.")
    .isMongoId().withMessage("Invalid chatId format."),

  validate,
];

const sendMessageValidator = [
  body("chatId")
    .notEmpty().withMessage("chatId is required.")
    .isMongoId().withMessage("Invalid chatId format."),

  body("text")
    .notEmpty().withMessage("Message text is required.")
    .isString().withMessage("Message text must be a string.")
    .trim()
    .isLength({ min: 1, max: VALIDATION.MESSAGE_MAX_LENGTH })
    .withMessage(`Message text must be between 1 and ${VALIDATION.MESSAGE_MAX_LENGTH} characters.`),

  validate,
];

// ─── AI Chat (existing chat) ───────────────────────────────────────────────────

const aiChatValidator = [
  body("chatId")
    .notEmpty().withMessage("chatId is required.")
    .isMongoId().withMessage("Invalid chatId format."),

  body("message")
    .notEmpty().withMessage("message is required.")
    .isString().withMessage("message must be a string.")
    .trim()
    .isLength({ min: 1, max: VALIDATION.MESSAGE_MAX_LENGTH })
    .withMessage(`message must be between 1 and ${VALIDATION.MESSAGE_MAX_LENGTH} characters.`)
    .custom((val) => {
      if (!val.trim()) throw new Error("message cannot be empty or whitespace only.");
      return true;
    }),

  validate,
];

// ─── AI Chat (new chat) — chatId not required ─────────────────────────────────

const aiChatNewValidator = [
  body("message")
    .notEmpty().withMessage("message is required.")
    .isString().withMessage("message must be a string.")
    .trim()
    .isLength({ min: 1, max: VALIDATION.MESSAGE_MAX_LENGTH })
    .withMessage(`message must be between 1 and ${VALIDATION.MESSAGE_MAX_LENGTH} characters.`)
    .custom((val) => {
      if (!val.trim()) throw new Error("message cannot be empty or whitespace only.");
      return true;
    }),

  body("chatTitle")
    .optional()
    .isString().withMessage("chatTitle must be a string.")
    .trim()
    .isLength({ max: VALIDATION.CHAT_TITLE_MAX_LENGTH })
    .withMessage(`chatTitle cannot exceed ${VALIDATION.CHAT_TITLE_MAX_LENGTH} characters.`),

  validate,
];

// ─── Pagination ────────────────────────────────────────────────────────────────

const paginationValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 }).withMessage("page must be a positive integer.")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100.")
    .toInt(),

  validate,
];

module.exports = {
  registerValidator,
  loginValidator,
  createChatValidator,
  chatIdParamValidator,
  chatIdInParamValidator,
  sendMessageValidator,
  aiChatValidator,
  aiChatNewValidator,
  paginationValidator,
};
