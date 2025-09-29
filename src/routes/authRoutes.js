const express = require("express");
const router = express.Router();
const { getAuth } = require('firebase-admin/auth');
const { admin } = require('../config/firebase-admin');
const User = require("../models/User.js");
const { sendOtpEmail } = require('../config/mailer');

/**
 * @swagger
 * /auth/send-otp:
 *   post:
 *     summary: Send OTP to email for signup verification
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, name, password, role]
 *             properties:
 *               email:
 *                 type: string
 *               name:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 description: One of citizen, official, analyst, admin
 *     responses:
 *       '200':
 *         description: OTP sent successfully.
 *       '400':
 *         description: Missing fields or account already exists.
 *       '500':
 *         description: Failed to send OTP.
 */
// -------------------- SEND OTP --------------------
router.post('/send-otp', async (req, res) => {
  try {
    const { email, name, password, role } = req.body;
    if (!email || !name || !password || !role) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Check if a Firebase account already exists
    const existingUser = await User.findOne({ email, firebaseUid: { $exists: true } });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    // Generate OTP and expiry
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Save TEMPORARY user (no firebaseUid yet). Do NOT store password in DB.
    await User.findOneAndUpdate(
      { email },
      { name, email, role, otp, otpExpires },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await sendOtpEmail(email, otp);
    res.status(200).json({ message: 'OTP sent successfully.' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ error: 'Failed to send OTP.' });
  }
});

// -------------------- VERIFY OTP & SIGNUP --------------------
/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Verify OTP and create user in Firebase and MongoDB
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name, role, otp]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *               name: { type: string }
 *               role: { type: string }
 *               otp: { type: string }
 *     responses:
 *       '201':
 *         description: User created successfully.
 *       '400':
 *         description: Invalid or expired OTP, or missing fields.
 *       '500':
 *         description: Failed to create user.
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, role, otp } = req.body;
    if (!email || !otp || !password || !name || !role) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Find TEMP user with valid OTP
    const user = await User.findOne({
      email,
      otp: otp.toString(), // ✅ ensure string comparison
      otpExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired OTP.' });
    }

    // ✅ Create Firebase user with provided password
    const firebaseUser = await getAuth().createUser({
      email: email,
      password: password,
      displayName: name,
    });

    // ✅ Save Firebase UID & clean sensitive data
    user.firebaseUid = firebaseUser.uid;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.status(201).json({ message: 'User created successfully!' });
  } catch (error) {
    console.error('Signup error:', error);
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

// -------------------- LOGIN (verify Firebase ID token) --------------------
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Verify Firebase ID token and upsert user record
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idToken]
 *             properties:
 *               idToken: { type: string }
 *     responses:
 *       '200':
 *         description: Authenticated user returned.
 *       '400':
 *         description: Missing idToken.
 *       '401':
 *         description: Invalid or expired token.
 */
router.post('/login', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'Missing idToken' });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    const email = decoded.email;
    const uid = decoded.uid;

    // Ensure user exists in Mongo and is linked
    let user = await User.findOne({ email });
    if (!user) {
      // Create minimal record if missing
      user = await User.create({ name: decoded.name || 'User', email, role: 'citizen', firebaseUid: uid });
    } else if (!user.firebaseUid) {
      user.firebaseUid = uid;
      await user.save();
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error('Login route error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});


/**
 * @swagger
 * /auth/upsert:
 *   post:
 *     summary: Upsert a user profile using Firebase ID token
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Upserted or fetched user profile.
 *       '401':
 *         description: Authentication failed.
 */
router.post("/upsert", async (req, res) => {
  try {
    // 1. Get the Firebase ID token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authorization header with Bearer token required" });
    }
    const idToken = authHeader.split(" ")[1];

    // 2. Verify the token using Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // 3. Look for the user in your MongoDB database
    // IMPORTANT: We use "firebaseUid" to match your corrected schema
    let user = await User.findOne({ firebaseUid: decodedToken.uid });

    // 4. If the user does not exist, create them
    if (!user) {
      console.log("User not found in DB, creating new profile...");
      user = await User.create({
        firebaseUid: decodedToken.uid,
        email: decodedToken.email,
        // Prioritize name/role from the request body (sent during signup),
        // otherwise fall back to info from the token or defaults.
        name: req.body.name || decodedToken.name || "New User",
        role: req.body.role || "citizen",
      });
    }

    // 5. Return the final user profile (either found or newly created)
    return res.status(200).json({ user });

  } catch (error) {
    console.error("Auth login/signup error:", error);
    // The token is likely invalid or expired
    return res.status(401).json({ error: "Authentication failed. Please log in again." });
  }
});

module.exports = router;
