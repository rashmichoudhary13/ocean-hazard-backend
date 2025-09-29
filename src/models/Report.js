// models/Report.js

const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
  // --- Core Information ---
  userId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true 
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
  
  // --- ✅ NEW: Hazard Classification ---
  hazardCategory: {
    type: String,
    required: true,
    enum: ['natural', 'manmade']
  },
  hazardType: { 
    type: String, 
    required: true,
    // ✅ UPDATED: Expanded enum to include all hazard types
    enum: [
      'Unusual Tides', 'Flooding', 'Coastal damage', 'High Waves', 
      'Swell Surges', 'Tsunami', 'Oil Spill', 'Pollution/Debris', 
      'Abnormal Sea Behaviour', 'Other Hazard'
    ]
  },
  severityLevel: {
    type: String,
    required: true,
    enum: ['Low', 'Medium', 'High']
  },

  // --- Report Details ---
  description: { 
    type: String,
    required: true // Description is required by the form
  },
  mediaUrl: { 
    type: String,
    default: null // Optional field
  },

  // --- Timestamps ---
  reportDate: {
    type: Date, // The date of the observation set by the user
    required: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now // The date the report was created in the system
  },
});

// Index for geospatial queries
reportSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Report", reportSchema);