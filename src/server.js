/**
 * @file server.js
 * @description Main server file for the Ocean Hazard backend.
 */

const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");

// Import Routes
const authRoutes = require("./routes/authRoutes");
const reportRoutes = require("./routes/reportRoutes");
const socialMediaRoutes = require("./routes/socialMediaRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

// Initialize Express app
const app = express();

// Connect Database
connectDB();

// Middleware should be placed before routes
app.use(cors());
// The global express.json() middleware has been removed to prevent conflicts with multer.

// Define routes
app.use("/auth", authRoutes);
app.use("/reports", reportRoutes);
app.use("/socialmedia", socialMediaRoutes);
app.use("/dashboard", dashboardRoutes);

// Simple route to check if server is running
app.get("/", (req, res) => {
  res.send("Ocean Hazard Backend is running 🌊");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));