/**
 * @file reportRoutes.js
 * @description API routes for managing crowdsourced hazard reports. (Cloudinary Version)
 */

const express = require("express");
const router = express.Router();

// 👈 1. Import multer and your Cloudinary config
const multer = require('multer');
const { storage } = require('../config/cloudinary'); // Assumes you have config/cloudinary.js

// Middleware and Models
const verifyToken = require("../middleware/verifyToken");
const Report = require("../models/Report");
const checkRole = require("../middleware/checkRole");

// 👈 2. Initialize multer with the Cloudinary storage engine
const upload = multer({ storage });

// An array of the allowed hazard types, directly from the schema
const ALLOWED_HAZARD_TYPES = Report.schema.path('hazardType').enumValues;

// 👉 Get all reports (This route remains unchanged)
router.get("/", async (req, res) => {
    try {
        const { hazardType, startDate, endDate, lat, lon, radius, page = 1, limit = 10 } = req.query;
        const filter = {};

        if (hazardType) {
            filter.hazardType = hazardType;
        }

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        if (lat && lon && radius) {
            filter.location = {
                $geoWithin: {
                    $centerSphere: [
                        [parseFloat(lon), parseFloat(lat)],
                        parseFloat(radius) / 6378.1
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


// 👉 3. UPDATED: Submit a hazard report (now accepts a file upload)
router.post(
    "/",
    verifyToken,
    checkRole(['citizen', 'official']),
    upload.single('media'), // This middleware intercepts a file from a form field named 'media'
    async (req, res) => {
        try {
            const { latitude, longitude, hazardType, description } = req.body;

            if (!latitude || !longitude || !hazardType) {
                return res.status(400).json({ error: "Latitude, longitude, and hazard type are required" });
            }

            if (!ALLOWED_HAZARD_TYPES.includes(hazardType)) {
                return res.status(400).json({
                    error: `Invalid hazard type. Must be one of: ${ALLOWED_HAZARD_TYPES.join(', ')}`
                });
            }
            
            if (!req.appUser) {
                 return res.status(404).json({ error: "Authenticated user not found in the database." });
            }

            const newReport = new Report({
                userId: req.appUser._id,
                location: {
                    type: 'Point',
                    coordinates: [parseFloat(longitude), parseFloat(latitude)]
                },
                hazardType,
                description,
                // If a file was uploaded by multer, its Cloudinary URL is at req.file.path
                mediaUrl: req.file ? req.file.path : null 
            });

            await newReport.save();
            const populatedReport = await Report.findById(newReport._id).populate('userId', 'name email');
            res.status(201).json(populatedReport);
            
        } catch (err) {
            console.error("Error creating report:", err);
            res.status(500).json({ error: "Failed to create report" });
        }
    }
);

module.exports = router;