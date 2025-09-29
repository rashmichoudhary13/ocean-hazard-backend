/**
 * @file reportRoutes.js
 * @description API routes for managing crowdsourced hazard reports.
 */

const express = require("express");
const router = express.Router();

// Import multer and your Cloudinary config
const multer = require('multer');
const { storage } = require('../config/cloudinary');

// Middleware, Models, and Services
const verifyToken = require("../middleware/verifyToken");
const Report = require("../models/Report");
const checkRole = require("../middleware/checkRole");
const { classifyHazardMedia } = require('../services/geminiService');

// Initialize multer with the Cloudinary storage engine
const upload = multer({ storage });

// ✅ Get allowed values directly from the Mongoose schema for robust validation
const ALLOWED_CATEGORIES = Report.schema.path('hazardCategory').enumValues;
const ALLOWED_HAZARD_TYPES = Report.schema.path('hazardType').enumValues;
const ALLOWED_SEVERITY = Report.schema.path('severityLevel').enumValues;


/**
 * @swagger
 * /reports:
 *   get:
 *     summary: Get hazard reports with optional filters and pagination
 *     tags:
 *       - Reports
 *     parameters:
 *       - in: query
 *         name: hazardType
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: lat
 *         schema:
 *           type: number
 *       - in: query
 *         name: lon
 *         schema:
 *           type: number
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           description: Radius in kilometers
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       '200':
 *         description: Paginated list of reports
 *       '500':
 *         description: Server error
 */
// --- GET ALL REPORTS ---
// This route remains unchanged.
router.get("/", async (req, res) => {
    try {
        const { hazardType, startDate, endDate, lat, lon, radius, page = 1, limit = 10 } = req.query;
        const filter = {};

        if (hazardType) filter.hazardType = hazardType;
        if (startDate) filter.createdAt = { ...filter.createdAt, $gte: new Date(startDate) };
        if (endDate) filter.createdAt = { ...filter.createdAt, $lte: new Date(endDate) };

        if (lat && lon && radius) {
            filter.location = {
                $geoWithin: {
                    $centerSphere: [
                        [parseFloat(lon), parseFloat(lat)],
                        parseFloat(radius) / 6378.1 // Convert radius from km to radians
                    ]
                }
            };
        }

        const [reports, totalCount] = await Promise.all([
            Report.find(filter)
                .limit(parseInt(limit))
                .skip((parseInt(page) - 1) * parseInt(limit))
                .sort({ createdAt: -1 })
                .populate('userId', 'name email'),
            Report.countDocuments(filter)
        ]);

        res.json({
            reports,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: parseInt(page),
            totalReports: totalCount
        });

    } catch (err) {
        console.error("Error fetching reports:", err);
        res.status(500).json({ error: "Failed to fetch reports" });
    }
});


// --- ✅ UPDATED: SUBMIT A HAZARD REPORT ---
/**
 * @swagger
 * /reports:
 *   post:
 *     summary: Submit a hazard report with optional media upload
 *     tags:
 *       - Reports
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *               - hazardCategory
 *               - hazardType
 *               - severityLevel
 *               - description
 *               - reportDate
 *             properties:
 *               latitude:
 *                 type: string
 *               longitude:
 *                 type: string
 *               hazardCategory:
 *                 type: string
 *               hazardType:
 *                 type: string
 *               severityLevel:
 *                 type: string
 *               description:
 *                 type: string
 *               reportDate:
 *                 type: string
 *                 format: date
 *               media:
 *                 type: string
 *                 format: binary
 *     responses:
 *       '201':
 *         description: Report created
 *       '400':
 *         description: Validation error
 *       '500':
 *         description: Server error
 */
router.post(
    "/",
    verifyToken,
    checkRole(['citizen', 'official']),
    upload.single('media'), // Multer handles the file upload first
    async (req, res) => {
        try {
            // 1. Destructure all new fields from the request body
            const { 
                latitude, longitude, hazardCategory, hazardType, 
                severityLevel, description, reportDate 
            } = req.body;

            // 2. Comprehensive Validation for all required fields
            const requiredFields = { latitude, longitude, hazardCategory, hazardType, severityLevel, description, reportDate };
            for (const [field, value] of Object.entries(requiredFields)) {
                if (!value) {
                    return res.status(400).json({ error: `${field} is a required field.` });
                }
            }

            // 3. Enum Validation to ensure data integrity
            if (!ALLOWED_CATEGORIES.includes(hazardCategory)) {
                return res.status(400).json({ error: `Invalid hazard category.` });
            }
            if (!ALLOWED_HAZARD_TYPES.includes(hazardType)) {
                return res.status(400).json({ error: `Invalid hazard type.` });
            }
            if (!ALLOWED_SEVERITY.includes(severityLevel)) {
                return res.status(400).json({ error: `Invalid severity level.` });
            }
            if (!req.appUser) {
                return res.status(404).json({ error: "Authenticated user not found in the database." });
            }

            // --- AI Media Classification (Logic remains the same) ---
            let mediaUrl = req.file ? req.file.path : null;
            let mediaMimeType = req.file ? req.file.mimetype : null;

            if (mediaUrl && mediaMimeType) {
                const isMatch = await classifyHazardMedia(mediaUrl, mediaMimeType, hazardType);
                if (!isMatch) {
                    console.warn(`AI classification failed for ${hazardType} with media ${mediaUrl}`);
                    return res.status(400).json({ 
                        error: "The uploaded media does not appear to match the selected hazard type. Please select the correct type or upload a different image."
                    });
                }
            }

            // 4. Create the new report object with all fields
            const newReport = new Report({
                userId: req.appUser._id,
                location: {
                    type: 'Point',
                    coordinates: [parseFloat(longitude), parseFloat(latitude)]
                },
                hazardCategory,
                hazardType,
                severityLevel,
                description,
                reportDate: new Date(reportDate), // Ensure it's a Date object
                mediaUrl: mediaUrl 
            });

            await newReport.save();
            const populatedReport = await Report.findById(newReport._id).populate('userId', 'name email');
            
            res.status(201).json(populatedReport);
            
        } catch (err) {
            console.error("Error creating report:", err);
            res.status(500).json({ error: "Failed to create report due to a server error." });
        }
    }
);

module.exports = router;
