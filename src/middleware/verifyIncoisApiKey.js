/**
 * @file verifyIncoisApiKey.js
 * @description Middleware to secure INCOIS-specific endpoints with an API key.
 */

const verifyIncoisApiKey = (req, res, next) => {
    // Get the API key from the request headers.
    const apiKeyFromHeader = req.headers['x-api-key'];
  
    // ✨ TEMPORARY FIX: Hardcode the correct API key to bypass .env file issues.
    const expectedApiKey = "cwincoissk9zKv8Bp5sFqGjL2mN4r7w";
  
    // Check if the key from Postman matches our hardcoded key.
    if (!apiKeyFromHeader || apiKeyFromHeader !== expectedApiKey) {
      return res.status(403).json({ error: 'Forbidden: Invalid or missing API key.' });
    }
  
    // If the key is valid, proceed.
    next();
  };
  
  module.exports = verifyIncoisApiKey;
  
  