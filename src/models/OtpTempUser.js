const mongoose = require("mongoose");

const otpTempUserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // TEMP only
  role: { type: String, enum: ["citizen", "official"], required: true },
  otp: { type: String, required: true },
  otpExpires: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.model("OtpTempUser", otpTempUserSchema);
