/**
 * services/geminiService.js
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const logger = require("../utils/logger");
const { AI, DEFAULTS } = require("../config/constants");

const CONTEXT = "GeminiService";

// ─── Lazy singleton ───────────────────────────────────────────────────────────
let genAI;

const getClient = () => {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const err = new Error("GEMINI_API_KEY is not defined in environment variables.");
      logger.error(CONTEXT, "Missing API key", err);
      throw err;
    }
    genAI = new GoogleGenerativeAI(apiKey);
    logger.debug(CONTEXT, "Gemini client initialized");
  }
  return genAI;
};

/**
 * Maps internal DB message format → Gemini API history format.
 * Gemini expects roles: "user" | "model"
 */
const formatHistoryForGemini = (messages) => {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((msg) => msg?.text && msg?.role)
    .map((msg) => ({
      role: msg.role === "ai" ? "model" : "user",
      parts: [{ text: String(msg.text) }],
    }));
};

/**
 * Sends a message to the Gemini API and returns the AI response text.
 * Includes the full conversation history for context-aware responses.
 *
 * @param {string} userMessage          - The user's current message
 * @param {Array}  conversationHistory  - Previous DB messages for context
 * @returns {Promise<string>}           - AI response text
 */
const sendMessageToGemini = async (userMessage, conversationHistory = []) => {
  const startTime = Date.now();

  logger.debug(CONTEXT, "Sending message to Gemini", {
    historyLength: conversationHistory.length,
    messageLength: userMessage?.length ?? 0,
  });

  try {
    const client = getClient();
    const modelName = process.env.GEMINI_MODEL || DEFAULTS.GEMINI_MODEL;

    const model = client.getGenerativeModel({
      model: modelName,
      generationConfig: {
        maxOutputTokens: AI.MAX_OUTPUT_TOKENS,
        temperature: AI.TEMPERATURE,
        topP: 0.95,
        topK: 40,
      },
      systemInstruction: {
        parts: [
          {
            text: "You are a helpful, accurate, and friendly AI assistant. Provide clear and concise responses. If you are unsure about something, say so instead of making up information.",
          },
        ],
      },
    });

    const history = formatHistoryForGemini(conversationHistory);
    const chat = model.startChat({ history });

    const result = await chat.sendMessage(String(userMessage));

    // ── Optional chaining at every level — never crashes on shape change ──────
    const response = await result?.response;
    const text = response?.text?.();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      logger.warn(CONTEXT, "Gemini returned empty or invalid response", {
        hasResult: !!result,
        hasResponse: !!response,
        textType: typeof text,
      });
      return AI.FALLBACK_MESSAGE;
    }

    const durationMs = Date.now() - startTime;
    logger.aiInteraction(
      "unknown", // userId not available here — logged in controller
      "unknown",
      userMessage,
      text,
      durationMs
    );

    return text;

  } catch (error) {
    logger.error(CONTEXT, "Gemini API call failed", error);

    const status = error?.status ?? error?.response?.status;

    if (status === 429) {
      throw new Error("AI service rate limit reached. Please wait a moment and try again.");
    }
    if (status === 400) {
      throw new Error("Invalid request to AI service. Please try a different message.");
    }
    if (status === 403) {
      throw new Error("AI service authentication failed. Please contact support.");
    }
    if (status === 503 || status === 502) {
      throw new Error("AI service is temporarily unavailable. Please try again in a few moments.");
    }
    if (
      error?.message?.includes("SAFETY") ||
      error?.message?.includes("safety") ||
      error?.message?.includes("blocked")
    ) {
      throw new Error("Your message was flagged by the AI safety filters. Please rephrase your request.");
    }
    if (error?.code === "ECONNRESET" || error?.code === "ETIMEDOUT") {
      throw new Error("Connection to AI service timed out. Please try again.");
    }

    throw new Error(AI.FALLBACK_MESSAGE);
  }
};

module.exports = { sendMessageToGemini };
