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
router.use(verifyToken, checkRole(['official', 'analyst', 'admin', 'citizen']));

/**
 * @swagger
 * /dashboard/stats:
 *   get:
 *     summary: Get high-level dashboard statistics
 *     tags:
 *       - Dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Aggregated statistics
 *       '500':
 *         description: Server error
 */
router.get("/stats", async (req, res) => {
    // ... (This route is unchanged)
});

/**
 * @swagger
 * /dashboard/reports-over-time:
 *   get:
 *     summary: Get report counts aggregated over time
 *     tags:
 *       - Dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Time-series data
 *       '500':
 *         description: Server error
 */
router.get("/reports-over-time", async (req, res) => {
    // ... (This route is unchanged)
});

/**
 * @swagger
 * /dashboard/hazard-map:
 *   get:
 *     summary: Get geospatial hazard data for map display
 *     tags:
 *       - Dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Map data
 *       '500':
 *         description: Server error
 */
router.get("/hazard-map", async (req, res) => {
    // ... (This route is unchanged)
});

/**
 * @swagger
 * /dashboard/leaderboard:
 *   get:
 *     summary: Get top contributors by number of reports
 *     tags:
 *       - Dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Leaderboard of users
 *       '500':
 *         description: Server error
 */
router.get("/leaderboard", async (req, res) => {
    try {
        const topUsers = await Report.aggregate([
            // Counts all reports per user since there's no 'status' field
            { $group: { _id: '$userId', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: "$user" },
            {
                $project: {
                    _id: 0,
                    count: 1,
                    "user.name": 1,
                    "user.email": 1,
                }
            }
        ]);
        res.json(topUsers);
    } catch (err) {
        console.error("Error fetching leaderboard data:", err);
        res.status(500).json({ error: "Failed to fetch leaderboard." });
    }
});

module.exports = router;