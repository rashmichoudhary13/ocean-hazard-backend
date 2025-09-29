const { GoogleGenerativeAI } = require("@google/generative-ai");

// The minimum confidence score required for a 'true' match.
const MIN_CONFIDENCE_THRESHOLD = 80;

// Hazard definitions to provide context to the AI model.
// Ensure these keys exactly match the `hazardType` enum in your Report.js model.
const HAZARD_DEFINITIONS = {
  "Unusual Tides": "Water levels that are significantly higher or lower than predicted, not caused by a storm.",
  "Flooding": "Inundation of normally dry coastal areas by seawater.",
  "Coastal damage": "Visible erosion or damage to seawalls, buildings, or infrastructure along the coast.",
  "High Waves": "Extremely large, wind-driven waves breaking with significant force.",
  "Swell Surges": "A rise in sea level above the normal tide, caused by storm winds pushing water ashore.",
  "Tsunami": "A massive surge of water or rapidly advancing tide pushing far inland.",
  "Oil Spill": "Visible slicks of oil on the water surface.",
  "Pollution/Debris": "Significant accumulation of man-made trash or pollutants.",
  "Abnormal Sea Behaviour": "Unusual water color, large areas of foam, or other strange phenomena.",
  "Other Hazard": "A catch-all for other clear and obvious ocean-related dangers.",
};

// Helper to convert an image URL to a base64 string for the API
async function urlToGenerativePart(url, mimeType) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch media from URL: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return {
      inlineData: {
        data: Buffer.from(arrayBuffer).toString('base64'),
        mimeType
      },
    };
  } catch (error) {
    console.error("Error preparing media for Gemini:", error.message);
    throw new Error("Could not prepare media for AI analysis.");
  }
}

/**
 * Classifies an image against a given hazard type using Gemini.
 * This function is designed to be "fail-open": if the AI service fails,
 * it will default to allowing the report submission to proceed.
 */
async function classifyHazardMedia(mediaUrl, mediaMimeType, hazardType) {
  // ✨ 1. Check if the API key is configured. If not, skip AI check.
  if (!process.env.GEMINI_API_KEY) {
    console.warn("WARNING: GEMINI_API_KEY is not set. Skipping AI classification and allowing report to be submitted.");
    return true;
  }

  if (!mediaMimeType.startsWith('image/')) {
    console.log(`Skipping classification for non-image media: ${mediaMimeType}`);
    return true; 
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const imagePart = await urlToGenerativePart(mediaUrl, mediaMimeType);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const hazardDefinition = HAZARD_DEFINITIONS[hazardType] || "a significant ocean-related hazard";
    const prompt = `
      You are an expert analyst verifying crowdsourced ocean hazard reports.
      Your task is to determine if the image provided is consistent with the reported hazard type.

      Hazard Type: "${hazardType}"
      Definition to look for: "${hazardDefinition}"

      Analyze the image carefully. Respond in a valid JSON format with three fields:
      1. "match": a boolean (true if the image is a plausible example of the hazard, false otherwise).
      2. "confidence": an integer (0-100) representing your confidence in the "match" decision.
      3. "reason": a brief, one-sentence explanation for your decision.
    `;

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text().trim();
    
    let aiResponse;
    let finalMatch = false;

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No valid JSON object found in the AI response.");
      }
      
      if (aiResponse.match === true && aiResponse.confidence >= MIN_CONFIDENCE_THRESHOLD) {
        finalMatch = true;
      }

    } catch (parseError) {
      console.error("Could not parse AI's JSON response:", responseText, parseError);
      // If parsing fails, default to a non-match for safety, but the report will still be allowed.
      finalMatch = false;
    }
    
    console.log(
      `AI Check | Hazard: ${hazardType} | AI Match: ${aiResponse.match} | Confidence: ${aiResponse.confidence}% | Final Decision: ${finalMatch}`
    );
    
    return finalMatch;

  } catch (error) {
    // ✨ 2. CRITICAL CHANGE FOR DEPLOYMENT: If the AI service fails, allow the report to proceed.
    console.error(`AI CLASSIFICATION FAILED | Hazard: ${hazardType} | Error: ${error.message}`);
    console.warn("Allowing report submission to proceed despite AI classification failure.");
    // We return 'true' so that the report is NOT blocked if the AI service is down.
    return true; 
  }
}

module.exports = { classifyHazardMedia };
