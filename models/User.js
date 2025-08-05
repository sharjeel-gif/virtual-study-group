// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // hashed
  role: { type: String, default: "user" }, // optional
  picture: { type: String, default: "/default-avatar.png" } // ✅ added profile picture
});

module.exports = mongoose.model("User", userSchema);
