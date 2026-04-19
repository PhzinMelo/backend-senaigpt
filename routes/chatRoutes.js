const express = require("express");
const router = express.Router();

const { getChats, createChat, deleteChat } = require("../controllers/chatController");
const { protect } = require("../middlewares/authMiddleware");
const {
  createChatValidator,
  chatIdParamValidator,
} = require("../middlewares/validationMiddleware");

// All chat routes require authentication
router.use(protect);

// GET /chats
router.get("/", getChats);

// POST /chats
router.post("/", createChatValidator, createChat);

// DELETE /chats/:id
router.delete("/:id", chatIdParamValidator, deleteChat);

module.exports = router;
