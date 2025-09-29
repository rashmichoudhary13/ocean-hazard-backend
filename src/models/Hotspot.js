// models/Hotspot.js
const mongoose = require('mongoose');

const HotspotSchema = new mongoose.Schema({
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  hotspotScore: {
    type: Number,
    required: true,
    index: true // Index for fast sorting
  },
  reportCount: {
    type: Number,
    required: true
  },
  // Store a summary of the hazards in this hotspot
  hazardSummary: {
    type: Map,
    of: Number // e.g., { "rip current": 5, "tsunami": 1 }
  },
  lastReportedAt: {
    type: Date,
    required: true
  },
  // The radius in meters that this hotspot covers
  radius: {
      type: Number,
      required: true
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Create a 2dsphere index for geospatial queries
HotspotSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Hotspot', HotspotSchema);