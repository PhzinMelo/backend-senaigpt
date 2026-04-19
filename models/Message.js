const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: [true, "chatId is required"],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "userId is required"],
      index: true,
    },
    text: {
      type: String,
      required: [true, "Message text is required"],
      trim: true,
      maxlength: [20000, "Message text cannot exceed 20000 characters"],
    },
    role: {
      type: String,
      enum: {
        values: ["user", "ai"],
        message: "Role must be either 'user' or 'ai'",
      },
      required: [true, "role is required"],
    },
  },
  {
    timestamps: true,
  }
);

// ─── Compound index for fast chat message retrieval ───────────────────────────
messageSchema.index({ chatId: 1, userId: 1, createdAt: 1 });

// ─── Remove __v from output ───────────────────────────────────────────────────
messageSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
