const mongoose = require("mongoose");

// Default to MongoDB Atlas URI if available
const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://localhost:27017/cs2marketplace";

// MongoDB connection options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  retryWrites: true,
  w: "majority",
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
};

mongoose
  .connect(MONGODB_URI, options)
  .then(() => {
    console.log(
      "Connected to MongoDB at:",
      MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@")
    ); // Hide password in logs
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    // Don't crash the app, just log the error
    console.warn(
      "Running without database connection - some features will be limited"
    );
  });
