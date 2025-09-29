const User = require("../models/User"); // Ensure the path to your User model is correct

/**
 * This middleware checks if a user has one of the allowed roles.
 * It must run AFTER the verifyToken middleware.
 */
const checkRole = (allowedRoles) => {
  return async (req, res, next) => {
    // 1. Check if the previous middleware (verifyToken) successfully attached the user
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: "Not authenticated. User details are missing." });
    }

    try {
      // 2. Use the uid from the verified token to find the user in YOUR MongoDB database
      const userProfile = await User.findOne({ firebaseUid: req.user.uid });

      if (!userProfile) {
        // This is the specific error you were seeing. It means the user is
        // authenticated with Firebase, but has no matching profile in your DB.
        return res.status(404).json({ error: "User not found in database." });
      }

      // 3. Check if the user's role is in the list of allowed roles for this route
      if (!allowedRoles.includes(userProfile.role)) {
        return res.status(403).json({ error: "Forbidden: You do not have the required role for this action." });
      }

      // 4. Success! Attach the full MongoDB user profile to the request object
      // so the next function (e.g., report submission) can use it.
      req.appUser = userProfile;
      next();
      
    } catch (err) {
      console.error("Role check error:", err.message);
      return res.status(500).json({ error: "Internal server error during role verification." });
    }
  };
};

module.exports = checkRole;
