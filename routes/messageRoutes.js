const express = require("express");
const router = express.Router();

const { getMessages, sendMessage } = require("../controllers/messageController");
const { protect } = require("../middlewares/authMiddleware");
const {
  chatIdInParamValidator,
  sendMessageValidator,
  paginationValidator,
} = require("../middlewares/validationMiddleware");

// All message routes require authentication
router.use(protect);

// GET /messages/:chatId?page=1&limit=50
router.get("/:chatId", chatIdInParamValidator, paginationValidator, getMessages);

// POST /messages
router.post("/", sendMessageValidator, sendMessage);

module.exports = router;
