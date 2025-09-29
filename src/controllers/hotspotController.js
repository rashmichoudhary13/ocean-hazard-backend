// controllers/hotspotController.js
const Hotspot = require('../models/Hotspot');

// @desc    Get all active hotspots
// @route   GET /api/hotspots
// @access  Public
exports.getHotspots = async (req, res) => {
  try {
    // Find hotspots and sort by the highest score
    const hotspots = await Hotspot.find().sort({ hotspotScore: -1 });
    res.status(200).json(hotspots);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};