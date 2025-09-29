/**
 * @file twitterService.js
 * @description Service for fetching, processing, and storing tweets from the Twitter/X API.
 */

const { TwitterApi } = require('twitter-api-v2');
const SocialMediaPost = require('../models/SocialMediaPost');
const { processText } = require('./nlpService'); // We will use our NLP service for analysis

// Initialize the Twitter client with your Bearer Token (App-only authentication)
const twitterClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);

// Create a read-only client
const readOnlyClient = twitterClient.readOnly;

/**
 * This is the main function our scheduler will call.
 * It fetches recent tweets based on hazard keywords for India, processes them,
 * and stores any new ones in the database.
 */
async function fetchAndStoreTweets() {
    console.log('🔵 Starting scheduled job: Fetching tweets...');

    // 1. Define the search query for the Twitter API
    const query = '("tsunami warning" OR "high tide" OR "storm surge" OR "coastal flooding" OR "cyclone alert" OR "rough seas" OR "high waves") India lang:en -is:retweet';

    try {
        // 2. Search for recent tweets using the Twitter v2 API
        const searchResult = await readOnlyClient.v2.search(query, {
            'tweet.fields': ['created_at', 'geo', 'author_id'],
            'expansions': ['author_id'],
            'user.fields': ['name', 'username'],
            'max_results': 25
        });

        if (!searchResult.data.data || searchResult.data.data.length === 0) {
            console.log('⚪ No new tweets found matching the criteria.');
            return;
        }

        const tweets = searchResult.data.data;
        const users = searchResult.includes.users;
        console.log(`Found ${tweets.length} potential tweets to process.`);

        const userMap = users.reduce((acc, user) => {
            acc[user.id] = user;
            return acc;
        }, {});

        // 3. Process each tweet found
        for (const tweet of tweets) {
            try {
                // ✨ FIX #1: Check for duplicates using the correct field name 'tweetId'
                const existingPost = await SocialMediaPost.findOne({ tweetId: tweet.id });
                if (existingPost) {
                    console.log(`Tweet ${tweet.id} already exists. Skipping.`);
                    continue;
                }

                const authorInfo = userMap[tweet.author_id];
                const nlpResult = processText(tweet.text);

                // ✨ FIX #2: Create the new post using the correct schema field names
                const newPost = new SocialMediaPost({
                    source: 'twitter',
                    tweetId: tweet.id, // Corrected from 'postId'
                    text: tweet.text,
                    author: {
                        id: authorInfo.id,
                        name: authorInfo.name,
                        username: authorInfo.username,
                    },
                    sourceUrl: `https://twitter.com/${authorInfo.username}/status/${tweet.id}`,
                    keywords: nlpResult.keywords,
                    sentiment: nlpResult.sentiment,
                    tweetedAt: new Date(tweet.created_at), // Corrected from 'postCreatedAt'
                    geo: tweet.geo || null
                });

                await newPost.save();
                console.log(`✅ Successfully stored new tweet from @${authorInfo.username}`);
            } catch (error) {
                if (error.code === 11000) {
                    console.log(`⚠️ Tweet ${tweet.id} already exists (duplicate key error). Skipping.`);
                } else {
                    console.error(`❌ Error processing tweet ${tweet.id}:`, error.message);
                }
                continue; // Skip this tweet and continue with the next one
            }
        }

        console.log('🟢 Finished tweet fetching process successfully.');

    } catch (error) {
        console.error('🔴 Error during the tweet fetching process:', error);
    }
}

module.exports = { fetchAndStoreTweets };