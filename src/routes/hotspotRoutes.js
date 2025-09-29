// routes/hotspotRoutes.js
const express = require('express');
const router = express.Router();
const { getHotspots } = require('../controllers/hotspotController');

/**
 * @swagger
 * /api/hotspots:
 *   get:
 *     summary: Get generated hazard hotspots
 *     tags:
 *       - Hotspots
 *     responses:
 *       '200':
 *         description: List of hotspots
 *       '500':
 *         description: Server error
 */
router.route('/').get(getHotspots);

module.exports = router;