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
      return null;
    }

    console.log(
      "Using MongoDB URI:",
      MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, "//\\1:****@")
    );
    console.log("Attempting to connect to MongoDB...");

    const connection = await mongoose.connect(MONGODB_URI, options);
    console.log("MongoDB Connected Successfully");

    // Test the connection by checking database stats
    const stats = await mongoose.connection.db.stats();
    console.log("Database stats:", {
      collections: stats.collections,
      objects: stats.objects,
      avgObjSize: stats.avgObjSize,
      dataSize: stats.dataSize,
      storageSize: stats.storageSize,
    });

    // Check if User collection exists and count documents
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    const collectionNames = collections.map((c) => c.name);
    console.log("Available collections:", collectionNames);

    if (collectionNames.includes("users")) {
      const userCount = await mongoose.connection.db
        .collection("users")
        .countDocuments();
      console.log("User collection exists with", userCount, "documents");
    } else {
      console.warn("User collection does not exist yet!");
    }

    return connection;
  } catch (err) {
    console.error("MongoDB connection error:", err);
    console.error(
      "Connection string format valid:",
      MONGODB_URI.startsWith("mongodb+srv://")
    );
    console.error(
      "MongoDB host reachable:",
      !err.message.includes("getaddrinfo")
    );
    console.error(
      "Authentication correct:",
      !err.message.includes("Authentication failed")
    );
    console.warn(
      "Database features will be limited until connection is established."
    );
    return null;
  }
};

// Export both the connection function and the mongoose instance
module.exports = { connectDB, mongoose };
