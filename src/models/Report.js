// models/Report.js

const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
  // Link to the User model
  userId: { 
    type: mongoose.Schema.Types.ObjectId, // 👈 CHANGE: Use ObjectId
    ref: 'User',                           // 👈 ADD: Reference to the User model
    required: true 
  },
  
  location: {
    // ... (rest of the schema is unchanged)
    type: {
      type: String,
      enum: ['Point'],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
  hazardType: { 
    type: String, 
    required: true,
    enum: [
      'unusual tides', 'flooding', 'coastal damage', 'tsunami',
      'swell surges', 'high waves', 'abnormal sea behaviour', 'other'
    ]
  },
  description: { type: String },
  mediaUrl: { type: String },
  createdAt: { type: Date, default: Date.now },
});

reportSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Report", reportSchema);