/**
 * @file SocialMediaPost.js
 * @description Mongoose model for social media posts from Twitter.
 */

const mongoose = require("mongoose");

const socialMediaPostSchema = new mongoose.Schema({
    source: {
        type: String,
        required: true,
        enum: ["twitter"],
        default: "twitter"
    },
    // ✨ FIX: Using 'tweetId' which is required and must be unique
    tweetId: {
        type: String,
        required: true,
        unique: true,
    },
    // Legacy field for backward compatibility - will be removed
    postId: {
        type: String,
        sparse: true, // Allows multiple null values
    },
    text: {
        type: String,
        required: true,
    },
    author: {
        id: { type: String },
        name: { type: String },
        username: { type: String },
    },
    sourceUrl: {
        type: String,
    },
    keywords: [{
        type: String,
    }],
    sentiment: {
        type: String,
        enum: ["positive", "neutral", "negative"],
    },
    // ✨ FIX: Using 'tweetedAt' for the timestamp of the tweet
    tweetedAt: {
        type: Date,
        required: true,
    },
    geo: {
        type: Object, // For storing any geo-data from Twitter
    },
}, {
    // This automatically adds `createdAt` and `updatedAt` fields to our documents
    timestamps: true
});

module.exports = mongoose.model("SocialMediaPost", socialMediaPostSchema);