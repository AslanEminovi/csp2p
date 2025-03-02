const mongoose = require("mongoose");

// Explicit database connection string
const MONGODB_URI = "mongodb+srv://eminoviaslan:asqo-140@csgeorgia.2hjvj.mongodb.net/cs2marketplace?retryWrites=true&w=majority&appName=CSGEorgia";

console.log("Using MongoDB URI:", MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@"));

// MongoDB connection options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  retryWrites: true,
  w: "majority",
  serverSelectionTimeoutMS: 10000, // Increase timeout for cloud environments
};

// Function to connect to MongoDB
const connectDB = async () => {
  try {
    console.log("Attempting to connect to MongoDB...");
    
    await mongoose.connect(MONGODB_URI, options);
    
    console.log("MongoDB connected successfully!");
    
    // Test the connection by checking database stats
    const stats = await mongoose.connection.db.stats();
    console.log("Database stats:", {
      collections: stats.collections,
      objects: stats.objects,
      avgObjSize: stats.avgObjSize,
      dataSize: stats.dataSize,
      storageSize: stats.storageSize
    });
    
    // Check if User collection exists and count documents
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log("Available collections:", collectionNames);
    
    if (collectionNames.includes('users')) {
      const userCount = await mongoose.connection.db.collection('users').countDocuments();
      console.log("User collection exists with", userCount, "documents");
    } else {
      console.warn("User collection does not exist yet!");
    }
    
    return true;
  } catch (err) {
    console.error("MongoDB connection error:", err);
    console.error("Connection string format valid:", MONGODB_URI.startsWith("mongodb+srv://"));
    console.error("MongoDB host reachable:", !err.message.includes("getaddrinfo"));
    console.error("Authentication correct:", !err.message.includes("Authentication failed"));
    
    return false;
  }
};

// Initial connection attempt
const dbPromise = connectDB();

// Export the connection function and promise
module.exports = { 
  connectDB,
  dbPromise
};
