/**
 * @file nlpService.js
 * @description A service to perform basic Natural Language Processing (NLP) on text using the 'natural' library.
 */

// Import the 'natural' library
const natural = require("natural");

// Initialize a sentiment analyzer with a lexicon (a dictionary of words and their sentiment scores)
const analyzer = new natural.SentimentAnalyzer("English", natural.PorterStemmer, "afinn");

// A list of keywords related to ocean hazards for your project
const hazardKeywords = [
    "tsunami", "tsunamis", "tsunami warning", "storm", "storm surge",
    "flooding", "flood", "high waves", "coastal damage", "erosion",
    "sea level rise", "unusual tides", "swell", "surge", "cyclone",
    "warning", "disaster", "emergency", "danger", "safe"
];

/**
 * This function will take a block of text and analyze it.
 * @param {string} text The input text to be processed.
 * @returns {{keywords: string[], sentiment: string}} An object containing found keywords and the sentiment.
 */
const processText = (text) => {
    // Use a tokenizer to split the text into individual words (tokens)
    const tokenizer = new natural.WordTokenizer();
    const tokens = tokenizer.tokenize(text.toLowerCase());

    // --- Find relevant keywords ---
    // We check if any of our predefined hazard keywords are in the text
    const foundKeywords = hazardKeywords.filter(keyword =>
        text.toLowerCase().includes(keyword)
    );

    // --- Analyze sentiment ---
    // The analyzer returns a score: > 0 for positive, < 0 for negative, 0 for neutral
    const sentimentScore = analyzer.getSentiment(tokens);
    
    let sentiment = "neutral";
    if (sentimentScore > 0.05) { // Using a small threshold to avoid classifying very weak scores as positive
        sentiment = "positive";
    } else if (sentimentScore < 0) {
        sentiment = "negative";
    }

    // Return the processed data
    return {
        keywords: foundKeywords,
        sentiment: sentiment,
    };
};

// Export the function so it can be used in other files
module.exports = {
    processText,
};