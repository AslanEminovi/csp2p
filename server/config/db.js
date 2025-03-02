const mongoose = require("mongoose");

// Default to MongoDB Atlas URI if available, with better error handling for missing URI
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGODB_URI) {
  console.error("No MongoDB URI provided in environment variables!");
  console.error("Please set MONGODB_URI in your environment variables.");
  console.error(
    "Example: mongodb+srv://username:password@cluster.mongodb.net/dbname"
  );
  // Don't use localhost as fallback in production
  if (process.env.NODE_ENV === "production") {
    throw new Error("MongoDB URI is required in production environment");
  }
  console.warn("Falling back to localhost MongoDB for development");
}

// MongoDB connection options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  retryWrites: true,
  w: "majority",
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
};

// Connect to MongoDB with better error handling
mongoose
  .connect(MONGODB_URI || "mongodb://localhost:27017/cs2marketplace", options)
  .then(() => {
    const sanitizedUri = MONGODB_URI
      ? MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@")
      : "mongodb://localhost:27017/cs2marketplace";
    console.log("Connected to MongoDB at:", sanitizedUri);
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    if (process.env.NODE_ENV === "production") {
      console.error(
        "Failed to connect to MongoDB Atlas. Please check your MONGODB_URI environment variable."
      );
      console.error(
        "Make sure the IP address of your server is whitelisted in MongoDB Atlas."
      );
    } else {
      console.error(
        "Failed to connect to local MongoDB. Make sure MongoDB is running locally."
      );
    }
    console.warn(
      "Running without database connection - some features will be limited"
    );
  });
