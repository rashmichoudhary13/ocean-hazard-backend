const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Note: The useNewUrlParser and useUnifiedTopology options are no longer necessary in Mongoose 6.0 and above.
    await mongoose.connect("mongodb://127.0.0.1:27017/oceanHazard");
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;
