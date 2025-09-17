const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firebaseId: { type: String, required: true, unique: true }, // UID from Firebase token
  name: { type: String },
  email: { type: String },
  role: { type: String, enum: ["citizen", "official", "analyst", "admin"], default: "citizen" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);
