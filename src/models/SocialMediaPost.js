/**
 * @file SocialMediaPost.js
 * @description Mongoose model for social media posts related to ocean hazards.
 */

const mongoose = require("mongoose");

const socialMediaPostSchema = new mongoose.Schema({
  source: {
    type: String,
    required: true,
    enum: ["twitter", "facebook", "youtube"]
  },
  postId: {
    type: String,
    required: true,
    unique: true
  },
  content: {
    type: String,
    required: true
  },
  author: {
    type: String
  },
  url: {
    type: String
  },
  keywords: [
    {
      type: String
    }
  ],
  sentiment: {
    type: String,
    enum: ["positive", "neutral", "negative"]
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
});

module.exports = mongoose.model("SocialMediaPost", socialMediaPostSchema);
