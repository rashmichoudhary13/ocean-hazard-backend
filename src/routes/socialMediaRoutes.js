/**
 * @file socialMediaRoutes.js
 * @description API routes for managing social media posts.
 */

const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const checkRole = require("../middleware/checkRole");
const SocialMediaPost = require("../models/SocialMediaPost");

router.use(express.json());

/**
 * @swagger
 * /socialmedia:
 *   get:
 *     summary: Retrieve a list of social media posts
 *     description: Fetches a paginated list of social media posts, with options to filter by keywords, sentiment, and date range.
 *     tags:
 *       - Social Media
 *     parameters:
 *       - in: query
 *         name: keywords
 *         schema:
 *           type: string
 *         description: Comma-separated list of keywords to search for (e.g., "tsunami,cyclone").
 *       - in: query
 *         name: sentiment
 *         schema:
 *           type: string
 *           enum: [positive, negative, neutral]
 *         description: Filter posts by sentiment.
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: The start date for the filter range (e.g., 2025-09-20).
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: The end date for the filter range (e.g., 2025-09-29).
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of results per page.
 *     responses:
 *       '200':
 *         description: A paginated list of social media posts.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SocialMediaPost'
 *                 totalPages:
 *                   type: integer
 *                 currentPage:
 *                   type: integer
 *                 totalPosts:
 *                   type: integer
 *       '500':
 *         description: Server error while fetching posts.
 */
router.get("/", async (req, res) => {
    try {
        const { source, sentiment, keywords, startDate, endDate, page = 1, limit = 20 } = req.query;
        const filter = {};

        if (source) filter.source = source;
        if (sentiment) filter.sentiment = sentiment;

        if (keywords) {
            const keywordArray = keywords.split(',').map(kw => kw.trim());
            filter.keywords = { $in: keywordArray };
        }

        if (startDate || endDate) {
            filter.tweetedAt = {};
            if (startDate) filter.tweetedAt.$gte = new Date(startDate);
            if (endDate) {
                const endOfDay = new Date(endDate);
                endOfDay.setHours(23, 59, 59, 999);
                filter.tweetedAt.$lte = endOfDay;
            }
        }

        const posts = await SocialMediaPost.find(filter)
            .sort({ tweetedAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .exec();

        const count = await SocialMediaPost.countDocuments(filter);

        res.json({
            posts,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            totalPosts: count,
        });
    } catch (err) {
        console.error("Error fetching social media posts:", err);
        res.status(500).json({ error: "Failed to fetch social media posts" });
    }
});


/**
 * @swagger
 * /socialmedia:
 *   post:
 *     summary: Manually submit a new social media post
 *     description: Allows a user with the 'official' role to manually add a social media post to the database. Requires authentication.
 *     tags:
 *       - Social Media
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               source:
 *                 type: string
 *                 description: The source platform (e.g., "twitter", "manual").
 *               postId:
 *                 type: string
 *                 description: The original ID of the post from the source platform.
 *               content:
 *                 type: string
 *                 description: The text content of the post.
 *               author:
 *                 type: string
 *                 description: The name or handle of the post's author.
 *               url:
 *                 type: string
 *                 description: A direct URL to the original post.
 *     responses:
 *       '201':
 *         description: Post created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SocialMediaPost'
 *       '400':
 *         description: Bad request, content is required.
 *       '401':
 *         description: Unauthorized, token is missing or invalid.
 *       '403':
 *         description: Forbidden, user does not have the required 'official' role.
 *       '409':
 *         description: Conflict, a post with this ID already exists.
 *       '500':
 *         description: Server error while creating the post.
 */
router.post("/", verifyToken, checkRole(['official']), async (req, res) => {
    try {
        const { source, postId, content, author, url } = req.body;

        if (!content) {
            return res.status(400).json({ error: "Content is required to process the post." });
        }

        const { processText } = require("../services/nlpService");
        const nlpResult = processText(content);
        
        const newPost = new SocialMediaPost({
            source: source || 'manual',
            tweetId: postId,
            author: { name: author },
            text: content,
            sourceUrl: url,
            keywords: nlpResult.keywords,
            sentiment: nlpResult.sentiment,
            tweetedAt: new Date(),
        });

        await newPost.save();
        return res.status(201).json(newPost);
    } catch (err) {
        console.error("Error creating manual social media post:", err);
        if (err.code === 11000) {
            return res.status(409).json({ error: "A post with this ID already exists." });
        }
        return res.status(500).json({ error: "Failed to create social media post." });
    }
});

module.exports = router;