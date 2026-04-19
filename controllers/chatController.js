/**
 * controllers/chatController.js
 *
 * Improvements applied:
 * - Structured logs for all operations
 * - Guard against empty chatTitle after trim
 * - Explicit userId enforcement in every query (belt-and-suspenders)
 */

const Chat = require("../models/Chat");
const Message = require("../models/Message");
const logger = require("../utils/logger");

const CONTEXT = "ChatController";

/**
 * @desc    Get all chats for the authenticated user
 * @route   GET /chats
 * @access  Private
 */
const getChats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    logger.debug(CONTEXT, "Fetching chats", { userId: String(userId) });

    const chats = await Chat.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    logger.info(CONTEXT, "Chats fetched", {
      userId: String(userId),
      count: chats.length,
    });

    return res.status(200).json({
      success: true,
      data: {
        chats,
        count: chats.length,
      },
    });
  } catch (error) {
    logger.error(CONTEXT, "Error fetching chats", error);
    next(error);
  }
};

/**
 * @desc    Create a new chat for the authenticated user
 * @route   POST /chats
 * @access  Private
 */
const createChat = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const rawTitle = req.body.chatTitle;

    // Guard: if client sends a whitespace-only title, fall back to default
    const chatTitle =
      typeof rawTitle === "string" && rawTitle.trim().length > 0
        ? rawTitle.trim()
        : "New Chat";

    logger.info(CONTEXT, "Creating chat", {
      userId: String(userId),
      chatTitle,
    });

    const chat = await Chat.create({ userId, chatTitle });

    logger.info(CONTEXT, "Chat created", {
      userId: String(userId),
      chatId: String(chat._id),
    });

    return res.status(201).json({
      success: true,
      data: { chat },
    });
  } catch (error) {
    logger.error(CONTEXT, "Error creating chat", error);
    next(error);
  }
};

/**
 * @desc    Delete a chat and all its messages (belonging to the authenticated user)
 * @route   DELETE /chats/:id
 * @access  Private
 */
const deleteChat = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const chatId = req.params.id;

    logger.info(CONTEXT, "Delete chat request", {
      userId: String(userId),
      chatId,
    });

    // Always filter by userId — a user can never delete another user's chat
    const chat = await Chat.findOneAndDelete({ _id: chatId, userId });

    if (!chat) {
      logger.warn(CONTEXT, "Chat not found or unauthorized for delete", {
        userId: String(userId),
        chatId,
      });
      return res.status(404).json({
        success: false,
        error: "Chat not found or you do not have permission to delete it.",
      });
    }

    // Cascade delete all messages in this chat belonging to this user
    const deletedMessages = await Message.deleteMany({ chatId, userId });

    logger.info(CONTEXT, "Chat deleted", {
      userId: String(userId),
      chatId,
      deletedMessagesCount: deletedMessages.deletedCount,
    });

    return res.status(200).json({
      success: true,
      data: {
        message: "Chat deleted successfully.",
        deletedChatId: chatId,
        deletedMessagesCount: deletedMessages.deletedCount,
      },
    });
  } catch (error) {
    logger.error(CONTEXT, "Error deleting chat", error);
    next(error);
  }
};

module.exports = { getChats, createChat, deleteChat };
