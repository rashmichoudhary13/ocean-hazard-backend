// services/hotspotService.js
const Report = require('../models/Report');
const Hotspot = require('../models/Hotspot');

// Define weights for different hazard types
const SEVERITY_WEIGHTS = {
  'tsunami': 10,
  'high waves': 8,
  'storm surge': 8,
  'rip current': 6,
  'flooding': 7,
  'unusual tides': 3,
  'coastal erosion': 4,
  'water pollution': 5,
  'other': 2
};

const ANALYSIS_RADIUS_METERS = 5000; // Analyze reports within a 5km radius
const MIN_REPORTS_FOR_HOTSPOT = 3;  // Minimum reports to be considered a hotspot

async function generateHotspots() {
  console.log('Starting hotspot generation job...');

  try {
    // 1. Get all approved reports from the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentReports = await Report.find({
      createdAt: { $gte: sevenDaysAgo }
    }).lean();

    if (recentReports.length < MIN_REPORTS_FOR_HOTSPOT) {
        console.log('Not enough recent reports to generate hotspots.');
        // Optional: Clear old hotspots
        await Hotspot.deleteMany({});
        return;
    }

    const hotspots = [];

    // 2. Loop through each report to find its neighbors
    for (const report of recentReports) {
      const [lon, lat] = report.location.coordinates;

      // Find neighboring reports within the radius
      const neighbors = recentReports.filter(neighbor => {
        const [nLon, nLat] = neighbor.location.coordinates;
        const distance = calculateDistance(lat, lon, nLat, nLon);
        return distance <= ANALYSIS_RADIUS_METERS / 1000; // convert radius to km
      });

      // 3. If enough neighbors, calculate hotspot score
      if (neighbors.length >= MIN_REPORTS_FOR_HOTSPOT) {
        let totalScore = 0;
        let weightedScoreSum = 0;
        let totalWeight = 0;
        const hazardSummary = {};
        
        neighbors.forEach(n => {
          const weight = SEVERITY_WEIGHTS[n.hazardType] || 1;
          const recencyFactor = 1 - ((Date.now() - new Date(n.createdAt).getTime()) / (7 * 24 * 60 * 60 * 1000)); // 1 for new, 0 for 7 days old
          totalScore += weight * recencyFactor;
          
          // For calculating weighted center
          weightedScoreSum += weight;
          totalWeight += weight;

          // Update summary
          hazardSummary[n.hazardType] = (hazardSummary[n.hazardType] || 0) + 1;
        });
        
        // Calculate the weighted centroid of the cluster
        const center = calculateWeightedCentroid(neighbors);

        hotspots.push({
          location: { type: 'Point', coordinates: center },
          hotspotScore: totalScore,
          reportCount: neighbors.length,
          hazardSummary: hazardSummary,
          lastReportedAt: new Date(Math.max(...neighbors.map(n => new Date(n.createdAt)))),
          radius: ANALYSIS_RADIUS_METERS,
        });
      }
    }

    // 4. De-duplicate hotspots (a simple approach)
    const uniqueHotspots = deduplicateHotspots(hotspots, 2000); // Don't allow hotspots within 2km of each other

    // 5. Clear the old hotspots and save the new ones
    await Hotspot.deleteMany({});
    if (uniqueHotspots.length > 0) {
        await Hotspot.insertMany(uniqueHotspots);
        console.log(`Successfully generated and saved ${uniqueHotspots.length} hotspots.`);
    } else {
        console.log('No significant hotspots were identified.');
    }

  } catch (error) {
    console.error('Error generating hotspots:', error);
  }
}

// --- Helper Functions ---

// Haversine formula to calculate distance between two points in km
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function calculateWeightedCentroid(neighbors) {
    let totalLat = 0, totalLon = 0, totalWeight = 0;
    neighbors.forEach(n => {
        const weight = SEVERITY_WEIGHTS[n.hazardType] || 1;
        totalLat += n.location.coordinates[1] * weight;
        totalLon += n.location.coordinates[0] * weight;
        totalWeight += weight;
    });
    return [totalLon / totalWeight, totalLat / totalWeight];
}

function deduplicateHotspots(hotspots, minDistanceMeters) {
    if (hotspots.length === 0) return [];
    // Sort by score to keep the most important ones
    hotspots.sort((a, b) => b.hotspotScore - a.hotspotScore);

    const unique = [];
    unique.push(hotspots[0]);

    for (let i = 1; i < hotspots.length; i++) {
        let isUnique = true;
        for (let j = 0; j < unique.length; j++) {
            const dist = calculateDistance(
                hotspots[i].location.coordinates[1],
                hotspots[i].location.coordinates[0],
                unique[j].location.coordinates[1],
                unique[j].location.coordinates[0]
            );
            if (dist * 1000 < minDistanceMeters) {
                isUnique = false;
                break;
            }
        }
        if (isUnique) {
            unique.push(hotspots[i]);
        }
    }
    return unique;
}

module.exports = { generateHotspots };