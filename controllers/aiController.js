/**
 * controllers/aiController.js
 */

const Chat = require("../models/Chat");
const Message = require("../models/Message");
const { sendMessageToGemini } = require("../services/geminiService");
const logger = require("../utils/logger");
const { AI, DEFAULTS, MESSAGE_ROLES, VALIDATION } = require("../config/constants");

const CONTEXT = "AiController";

/**
 * @desc    Send a message to AI in an existing chat (with history context)
 * @route   POST /ai/chat
 * @access  Private
 */
const aiChat = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { chatId, message } = req.body;

    logger.info(CONTEXT, "AI chat request received", {
      userId: String(userId),
      chatId: String(chatId),
      messageLength: message?.length ?? 0,
    });

    // ── 1. Verify chat belongs to the authenticated user ──────────────────────
    const chat = await Chat.findOne({ _id: chatId, userId }).lean();

    if (!chat) {
      logger.warn(CONTEXT, "Chat not found or unauthorized", {
        userId: String(userId),
        chatId: String(chatId),
      });
      return res.status(404).json({
        success: false,
        error: "Chat not found or you do not have permission to send messages to it.",
      });
    }

    // ── 2. Fetch recent conversation history for context ──────────────────────
    const conversationHistory = await Message.find({ chatId, userId })
      .sort({ createdAt: -1 })
      .limit(AI.HISTORY_CONTEXT_LIMIT)
      .lean();

    conversationHistory.reverse();

    logger.debug(CONTEXT, "History loaded", {
      userId: String(userId),
      chatId: String(chatId),
      historyLength: conversationHistory.length,
    });

    // ── 3. Save user message (role always hardcoded — never from client) ───────
    const userMessage = await Message.create({
      chatId,
      userId,
      text: message.trim(),
      role: MESSAGE_ROLES.USER,
    });

    // ── 4. Call Gemini API ────────────────────────────────────────────────────
    let aiResponseText;
    let aiCallFailed = false;

    try {
      aiResponseText = await sendMessageToGemini(message.trim(), conversationHistory);
    } catch (aiError) {
      logger.error(CONTEXT, "Gemini call failed — saving fallback message", aiError);
      aiCallFailed = true;
      aiResponseText = aiError.message || AI.FALLBACK_MESSAGE;
    }

    // ── 5. Save AI response (role always "ai", even for fallback) ─────────────
    const aiMessage = await Message.create({
      chatId,
      userId,
      text: aiResponseText,
      role: MESSAGE_ROLES.AI,
    });

    // ── 6. Auto-update chatTitle from first message if still default ──────────
    if (chat.chatTitle === DEFAULTS.CHAT_TITLE && conversationHistory.length === 0) {
      const rawTitle = message.trim();
      const autoTitle =
        rawTitle.length > VALIDATION.AUTO_TITLE_MAX_LENGTH
          ? rawTitle.slice(0, VALIDATION.AUTO_TITLE_MAX_LENGTH) + "..."
          : rawTitle;

      await Chat.findByIdAndUpdate(chatId, { chatTitle: autoTitle });
      logger.debug(CONTEXT, "Chat title auto-updated", { chatId: String(chatId), autoTitle });
    }

    logger.info(CONTEXT, "AI chat completed", {
      userId: String(userId),
      chatId: String(chatId),
      aiCallFailed,
      aiResponseLength: aiResponseText.length,
    });

    return res.status(200).json({
      success: true,
      data: {
        userMessage,
        aiMessage,
        ...(aiCallFailed && { warning: "AI response may be limited due to a service error." }),
      },
    });
  } catch (error) {
    logger.error(CONTEXT, "Unhandled error in aiChat", error);
    next(error);
  }
};

/**
 * @desc    Create a new chat and send the first AI message in one step
 * @route   POST /ai/chat/new
 * @access  Private
 */
const aiChatNew = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { message, chatTitle } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: "message is required.",
      });
    }

    logger.info(CONTEXT, "New AI chat request received", {
      userId: String(userId),
      messageLength: message.length,
      hasCustomTitle: !!chatTitle,
    });

    // ── 1. Auto-generate title ────────────────────────────────────────────────
    const rawMsg = message.trim();
    const resolvedTitle =
      chatTitle?.trim() ||
      (rawMsg.length > VALIDATION.AUTO_TITLE_MAX_LENGTH
        ? rawMsg.slice(0, VALIDATION.AUTO_TITLE_MAX_LENGTH) + "..."
        : rawMsg);

    // ── 2. Create chat ────────────────────────────────────────────────────────
    const chat = await Chat.create({ userId, chatTitle: resolvedTitle });

    // ── 3. Save user message ──────────────────────────────────────────────────
    const userMessage = await Message.create({
      chatId: chat._id,
      userId,
      text: rawMsg,
      role: MESSAGE_ROLES.USER,
    });

    // ── 4. Call Gemini API ────────────────────────────────────────────────────
    let aiResponseText;
    let aiCallFailed = false;

    try {
      aiResponseText = await sendMessageToGemini(rawMsg, []);
    } catch (aiError) {
      logger.error(CONTEXT, "Gemini call failed in aiChatNew — saving fallback", aiError);
      aiCallFailed = true;
      aiResponseText = aiError.message || AI.FALLBACK_MESSAGE;
    }

    // ── 5. Save AI response ───────────────────────────────────────────────────
    const aiMessage = await Message.create({
      chatId: chat._id,
      userId,
      text: aiResponseText,
      role: MESSAGE_ROLES.AI,
    });

    logger.info(CONTEXT, "New AI chat completed", {
      userId: String(userId),
      chatId: String(chat._id),
      aiCallFailed,
    });

    return res.status(201).json({
      success: true,
      data: {
        chat,
        userMessage,
        aiMessage,
        ...(aiCallFailed && { warning: "AI response may be limited due to a service error." }),
      },
    });
  } catch (error) {
    logger.error(CONTEXT, "Unhandled error in aiChatNew", error);
    next(error);
  }
};

module.exports = { aiChat, aiChatNew };
