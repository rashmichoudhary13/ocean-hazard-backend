/**
 * @file socialMediaRoutes.js
 * @description API routes for managing social media posts.
 */

const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const checkRole = require("../middleware/checkRole");
const SocialMediaPost = require("../models/SocialMediaPost");
const { processText } = require("../services/nlpService");

// 👇 ADD THIS LINE to parse JSON bodies for this router
router.use(express.json());

// 👉 Get all social media posts (with filtering)
router.get("/", async (req, res) => {
    try {
        const { source, sentiment } = req.query;
        const filter = {};

        if (source) {
            filter.source = source;
        }
        if (sentiment) {
            filter.sentiment = sentiment;
        }

        const posts = await SocialMediaPost.find(filter).sort({ date: -1 });
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch social media posts" });
    }
});

// 👉 Submit a social media post (protected route, requires 'official' role)
router.post("/", verifyToken, checkRole(['official']), async (req, res) => {
 try {
   const { source, postId, content, author, url } = req.body;
   
   if (!content) {
     return res.status(400).json({ error: "Content is required to process the post." });
   }

   // Use the NLP service to process the content
   const nlpResult = processText(content);
   
   // Create a new post with the processed data
   const newPost = new SocialMediaPost({
     source,
     postId,
     content,
     author,
     url,
     keywords: nlpResult.keywords,
     sentiment: nlpResult.sentiment,
   });

   await newPost.save();
   return res.status(201).json(newPost);
 } catch (err) {
   console.error(err);
   return res.status(500).json({ error: "Failed to create social media post." });
 }
});

module.exports = router;