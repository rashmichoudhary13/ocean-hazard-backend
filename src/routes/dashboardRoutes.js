/**
 * @file dashboardRoutes.js
 * @description API routes for fetching aggregated data for the dashboard.
 */

const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const checkRole = require("../middleware/checkRole");
const Report = require("../models/Report");
const SocialMediaPost = require("../models/SocialMediaPost");
const User = require("../models/User");

// Protect all dashboard routes so only authorized roles can access them
router.use(verifyToken, checkRole(['official', 'analyst', 'admin']));

// 👉 GET /dashboard/stats
// Provides key statistics for dashboard overview cards.
router.get("/stats", async (req, res) => {
    try {
        const [totalReports, totalUsers, reportsByType, sentimentCounts] = await Promise.all([
            Report.countDocuments(),
            User.countDocuments(),
            Report.aggregate([
                { $group: { _id: '$hazardType', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            SocialMediaPost.aggregate([
                { $group: { _id: '$sentiment', count: { $sum: 1 } } }
            ])
        ]);

        res.json({
            totalReports,
            totalUsers,
            reportsByType,
            sentimentCounts,
        });
    } catch (err) {
        console.error("Error fetching dashboard stats:", err);
        res.status(500).json({ error: "Failed to fetch dashboard statistics." });
    }
});

// 👉 GET /dashboard/reports-over-time
// Provides data for a time-series chart (e.g., reports per day for the last 30 days).
router.get("/reports-over-time", async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const reports = await Report.aggregate([
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } } // Sort by date ascending
        ]);
        res.json(reports);
    } catch (err) {
        console.error("Error fetching reports over time:", err);
        res.status(500).json({ error: "Failed to fetch time-series data." });
    }
});


// 👉 GET /dashboard/hazard-map
// Provides a lightweight list of all reports with just location and type for mapping.
router.get("/hazard-map", async (req, res) => {
    try {
        // Select only the fields needed for the map to keep the payload small
        const hazardPoints = await Report.find({}).select('location hazardType');
        res.json(hazardPoints);
    } catch (err) {
        console.error("Error fetching hazard map data:", err);
        res.status(500).json({ error: "Failed to fetch map data." });
    }
});

module.exports = router;