const mongoose = require("mongoose");

// Default to MongoDB Atlas URI if available, with better error handling for missing URI
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGODB_URI) {
  console.warn("No MongoDB URI provided in environment variables!");
  console.warn(
    "Database features will be available after user authentication."
  );
  console.warn("Please ensure MONGODB_URI is set for persistent data storage.");
}

// MongoDB connection options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  retryWrites: true,
  w: "majority",
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
};

// Function to connect to MongoDB
const connectDB = async () => {
  try {
    if (!MONGODB_URI) {
      console.warn("Waiting for database connection details...");
      return;
    }

    await mongoose.connect(MONGODB_URI, options);
    const sanitizedUri = MONGODB_URI.replace(
      /\/\/([^:]+):([^@]+)@/,
      "//$1:****@"
    );
    console.log("Connected to MongoDB at:", sanitizedUri);
  } catch (err) {
    console.error("MongoDB connection error:", err);
    console.warn(
      "Database features will be limited until connection is established."
    );
  }
};

// Initial connection attempt
connectDB();

// Export the connection function for use after authentication
module.exports = { connectDB };
