const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "userId is required"],
      index: true,
    },
    chatTitle: {
      type: String,
      required: [true, "chatTitle is required"],
      trim: true,
      maxlength: [200, "chatTitle cannot exceed 200 characters"],
      default: "New Chat",
    },
  },
  {
    timestamps: true,
  }
);

// ─── Index for fast user-based queries ───────────────────────────────────────
chatSchema.index({ userId: 1, createdAt: -1 });

// ─── Remove __v from output ───────────────────────────────────────────────────
chatSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Chat = mongoose.model("Chat", chatSchema);

module.exports = Chat;
