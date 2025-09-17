const express = require("express");
const router = express.Router();
const { admin } = require("../config/firebase.js");
const User = require("../models/User.js");

router.use(express.json());

// Option A: client sends ID token in header, we verify & create user if missing
router.post("/login", async (req, res) => {
  try {
    // Expect Authorization header: "Bearer <idToken>"
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(400).json({ error: "Authorization header required" });
    }
    const idToken = authHeader.split(" ")[1];
    const decoded = await admin.auth().verifyIdToken(idToken);

    // check if user exists in Mongo
    let user = await User.findOne({ firebaseId: decoded.uid });
    
    if (!user) {
      // 👇 THIS IS THE FIX 👇
      // Prioritize the name from the request body sent by the signup form.
      user = await User.create({
        firebaseId: decoded.uid,
        name: req.body.name || decoded.name || "", 
        email: decoded.email || "",
        // role defaults to 'citizen'
      });
    }

    return res.json({ user });
  } catch (err) {
    console.error("Auth login error:", err.message);
    return res.status(401).json({ error: "Invalid token" });
  }
});

module.exports = router;
