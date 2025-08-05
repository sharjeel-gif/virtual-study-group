const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: String,
  group: String,
  type: { type: String, default: "text" },
  message: String,
  fileName: String,
  fileUrl: String,
  isVoice: { type: Boolean, default: false }, // ✅ mark if it's a voice recording
  isFile: { type: Boolean, default: false },   // true if message is a file
  fileType: { type: String, default: "" },     // e.g. "image/png" or "audio/webm"
  seenBy: { type: [String], default: [] }, // ✅ Seen tracking
  reactions: { type: Map, of: [String], default: {} }, // ✅ emoji → [users]
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Message", messageSchema);
