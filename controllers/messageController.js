/**
 * controllers/messageController.js
 */

const Message = require("../models/Message");
const Chat = require("../models/Chat");
const logger = require("../utils/logger");
const { PAGINATION, MESSAGE_ROLES } = require("../config/constants");

const CONTEXT = "MessageController";

/**
 * @desc    Get all messages for a chat (paginated)
 * @route   GET /messages/:chatId
 * @access  Private
 */
const getMessages = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { chatId } = req.params;

    // ── Pagination — clamp defensively ────────────────────────────────────────
    const rawPage = parseInt(req.query.page, 10);
    const rawLimit = parseInt(req.query.limit, 10);
    const page =
      Number.isFinite(rawPage) && rawPage > 0 ? rawPage : PAGINATION.DEFAULT_PAGE;
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(rawLimit, PAGINATION.MAX_LIMIT)
        : PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    logger.debug(CONTEXT, "Fetching messages", {
      userId: String(userId),
      chatId,
      page,
      limit,
    });

    // ── Verify chat belongs to this user ──────────────────────────────────────
    const chat = await Chat.findOne({ _id: chatId, userId }).lean();

    if (!chat) {
      logger.warn(CONTEXT, "Chat not found or unauthorized", {
        userId: String(userId),
        chatId,
      });
      return res.status(404).json({
        success: false,
        error: "Chat not found or you do not have permission to view it.",
      });
    }

    // ── Fetch messages filtered by chatId AND userId ───────────────────────────
    const [messages, total] = await Promise.all([
      Message.find({ chatId, userId })
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Message.countDocuments({ chatId, userId }),
    ]);

    const totalPages = Math.ceil(total / limit);

    logger.info(CONTEXT, "Messages fetched", {
      userId: String(userId),
      chatId,
      count: messages.length,
      total,
      page,
    });

    return res.status(200).json({
      success: true,
      data: {
        messages,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
    });
  } catch (error) {
    logger.error(CONTEXT, "Error fetching messages", error);
    next(error);
  }
};

/**
 * @desc    Save a manual message to a chat (no AI call)
 * @route   POST /messages
 * @access  Private
 */
const sendMessage = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { chatId, text, role } = req.body;

    // ── Sanitize role — never trust the client value directly ─────────────────
    const validRoles = Object.values(MESSAGE_ROLES);
    const messageRole = validRoles.includes(role) ? role : MESSAGE_ROLES.USER;

    // ── Trim text defensively ─────────────────────────────────────────────────
    const messageText = typeof text === "string" ? text.trim() : "";

    if (!messageText) {
      return res.status(400).json({
        success: false,
        error: "Message text cannot be empty.",
      });
    }

    logger.debug(CONTEXT, "Saving manual message", {
      userId: String(userId),
      chatId,
      role: messageRole,
      textLength: messageText.length,
    });

    // ── Verify chat ownership ─────────────────────────────────────────────────
    const chat = await Chat.findOne({ _id: chatId, userId }).lean();

    if (!chat) {
      logger.warn(CONTEXT, "Chat not found or unauthorized for sendMessage", {
        userId: String(userId),
        chatId,
      });
      return res.status(404).json({
        success: false,
        error: "Chat not found or you do not have permission to send messages to it.",
      });
    }

    const message = await Message.create({
      chatId,
      userId,
      text: messageText,
      role: messageRole,
    });

    logger.info(CONTEXT, "Manual message saved", {
      userId: String(userId),
      chatId,
      messageId: String(message._id),
      role: messageRole,
    });

    return res.status(201).json({
      success: true,
      data: { message },
    });
  } catch (error) {
    logger.error(CONTEXT, "Error saving message", error);
    next(error);
  }
};

module.exports = { getMessages, sendMessage };
