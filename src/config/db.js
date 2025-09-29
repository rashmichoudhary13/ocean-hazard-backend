const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // ✨ FIX: Use the MONGO_URI from your .env file
    const connectionString = process.env.MONGO_URI;

    if (!connectionString) {
      throw new Error("MONGO_URI is not defined in the .env file.");
    }

    await mongoose.connect(connectionString);
    
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;

