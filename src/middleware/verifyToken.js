const { admin } = require("../config/firebase.js");
const User = require("../models/User.js");

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Authorization header missing" });
    }

    const token = authHeader.split(" ")[1]; // "Bearer <token>"
    if (!token) {
      return res.status(401).json({ error: "Token missing" });
    }

    const decoded = await admin.auth().verifyIdToken(token);
    // decoded contains uid, email, name, etc.
    req.firebaseUser = decoded;

    // Optionally, load user from MongoDB to attach app-role info
    const user = await User.findOne({ firebaseId: decoded.uid });
    req.appUser = user || null;

    next();
  } catch (err) {
    console.error("verifyToken error:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

module.exports = verifyToken;