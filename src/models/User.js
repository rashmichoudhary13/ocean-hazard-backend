const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firebaseUid: { 
    type: String,
    // The unique constraint is now handled by the index below
  },
  name: { 
    type: String,
    required: true
  },
  email: { 
    type: String,
    required: true,
    unique: true
  },
  role: { 
    type: String, 
    enum: ["citizen", "official", "analyst", "admin"], 
    default: "citizen" 
  },
  otp: { 
    type: String 
  },
  otpExpires: { 
    type: Date 
  },
}, {
  timestamps: true 
});

// ✨ FIX: Create a partial index that only enforces uniqueness for non-null values
userSchema.index({ firebaseUid: 1 }, { unique: true, partialFilterExpression: { firebaseUid: { $exists: true } } });

module.exports = mongoose.model("User", userSchema);