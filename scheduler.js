// scheduler.js
const cron = require('node-cron');
const { generateHotspots } = require('./src/services/hotspotService');

// ✨ FIX: Import the function with its CORRECT name: 'fetchAndStoreTweets'
const { fetchAndStoreTweets } = require('./src/services/twitterService');

function startScheduler() {
    // This job for hotspots runs every hour
    cron.schedule('0 * * * *', () => {
        console.log('Running scheduled job: Hotspot Generation');
        generateHotspots();
    });

    // This job for fetching tweets runs every 15 minutes
    cron.schedule('*/15 * * * *', () => {
        console.log('Running scheduled job: Fetching new tweets');

        // ✨ FIX: Call the function with its CORRECT name
        fetchAndStoreTweets(); 
    });

    console.log('✅ Cron scheduler started.');
}

module.exports = { startScheduler };