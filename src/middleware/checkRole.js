/**
 * @file checkRole.js
 * @description Middleware to check for user roles.
 */

const User = require("../models/User");

// This middleware function takes an array of roles that are allowed to access a route
const checkRole = (allowedRoles) => {
  return async (req, res, next) => {
    // We expect the verifyToken middleware to have already run
    if (!req.firebaseUser) {
      return res.status(401).json({ error: "Not authenticated. Token missing or invalid." });
    }

    try {
      // Find the user in our database using the Firebase UID
      const user = await User.findOne({ firebaseId: req.firebaseUser.uid });

      if (!user) {
        return res.status(404).json({ error: "User not found in database." });
      }

      // Check if the user's role is in the list of allowed roles
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: "Forbidden: You do not have the required role." });
      }

      // If everything is okay, attach the user object to the request
      req.appUser = user;
      next();
    } catch (err) {
      console.error("Role check error:", err.message);
      return res.status(500).json({ error: "Internal server error during role check." });
    }
  };
};

module.exports = checkRole;
