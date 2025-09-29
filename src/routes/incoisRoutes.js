const express = require("express");
const router = express.Router();

// Import your Mongoose models
const Report = require("../models/Report");
const Hotspot = require("../models/Hotspot"); // We'll use this for analytics

/**
 * @swagger
 * /api/incois/reports:
 *   get:
 *     summary: Fetch all hazard reports with filtering for INCOIS
 *     tags:
 *       - INCOIS
 *     parameters:
 *       - in: query
 *         name: fromDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: toDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: hazardType
 *         schema: { type: string }
 *       - in: query
 *         name: severity
 *         schema: { type: string }
 *     responses:
 *       '200':
 *         description: List of reports
 *       '500':
 *         description: Server error
 */
//================================================================================
// GET /api/incois/reports - Fetch all hazard reports with filtering
//================================================================================
router.get("/reports", async (req, res) => {
  try {
    const { fromDate, toDate, hazardType, severity } = req.query;
    const filter = {};

    // Note: The original plan mentioned a 'verified' status. Your current model
    // does not have this field, so this endpoint returns ALL reports.
    // This can be easily added back if you re-introduce the status field.

    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) filter.createdAt.$lte = new Date(toDate);
    }

    if (hazardType) {
      // Use case-insensitive matching for flexibility
      filter.hazardType = { $regex: new RegExp(`^${hazardType}$`, 'i') };
    }

    if (severity) {
      filter.severityLevel = { $regex: new RegExp(`^${severity}$`, 'i') };
    }

    const reports = await Report.find(filter)
      .sort({ createdAt: -1 })
      .populate('userId', 'name email role'); // Populate with user details

    res.status(200).json(reports);

  } catch (error) {
    console.error("INCOIS API /reports error:", error);
    res.status(500).json({ error: "Failed to fetch reports." });
  }
});

/**
 * @swagger
 * /api/incois/analytics:
 *   get:
 *     summary: Fetch aggregated analytics and active hotspots for INCOIS
 *     tags:
 *       - INCOIS
 *     responses:
 *       '200':
 *         description: Analytics payload
 *       '500':
 *         description: Server error
 */
//================================================================================
// GET /api/incois/analytics - Fetch aggregated stats and hotspots
//================================================================================
router.get("/analytics", async (req, res) => {
  try {
    // We can fetch multiple analytics in parallel for efficiency
    const [totalReports, hazardTrends, severityTrends, activeHotspots] = await Promise.all([
      // 1. Get total number of reports
      Report.countDocuments(),

      // 2. Get report counts grouped by hazard type
      Report.aggregate([
        { $group: { _id: '$hazardType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { _id: 0, hazardType: '$_id', count: 1 } }
      ]),

      // 3. Get report counts grouped by severity level
      Report.aggregate([
        { $group: { _id: '$severityLevel', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { _id: 0, severity: '$_id', count: 1 } }
      ]),
      
      // 4. Fetch the most critical, active hotspots
      Hotspot.find().sort({ hotspotScore: -1 }).limit(20)
    ]);

    res.status(200).json({
      totalReports,
      hazardTrends,
      severityTrends,
      activeHotspots
    });

  } catch (error) {
    console.error("INCOIS API /analytics error:", error);
    res.status(500).json({ error: "Failed to fetch analytics." });
  }
});


module.exports = router;
