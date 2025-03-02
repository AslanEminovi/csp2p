const mongoose = require("mongoose");

// Default to local MongoDB if no URI is provided
const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://localhost:27017/cs2marketplace";

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB at:", MONGODB_URI);
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    // Don't crash the app, just log the error
    console.warn(
      "Running without database connection - some features will be limited"
    );
  });
