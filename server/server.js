require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

// Suppress the Mongoose strictQuery warning for Mongoose 7
mongoose.set("strictQuery", false);

require("./config/db"); // Connect to MongoDB
require("./config/passport"); // Set up Passport strategy

// Import routes
const authRoutes = require("./routes/authRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const marketplaceRoutes = require("./routes/marketplaceRoutes");
const offerRoutes = require("./routes/offerRoutes");
const tradeRoutes = require("./routes/tradeRoutes");
const walletRoutes = require("./routes/walletRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();

// Enable CORS for your React client
app.use(
  cors({
    origin: process.env.CLIENT_URL 
      ? [process.env.CLIENT_URL] 
      : ["http://localhost:3000", "https://cs2-marketplace.onrender.com"],
    credentials: true,
  })
);

// Increased body size limit for larger payloads (e.g., when submitting multiple items)
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Check for session secret
if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required but not provided');
}

// Express session configuration (required by Passport)
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false, // Only save session if modified
  saveUninitialized: false, // Don't create session until something stored
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 1 day
    secure: process.env.NODE_ENV === 'production', // Set true in production
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Needed for cross-site cookie in production
    httpOnly: true // Prevents client-side JS from reading the cookie
  }
});

app.use(sessionMiddleware);

// Initialize Passport and restore authentication state
app.use(passport.initialize());
app.use(passport.session());

// API Routes
app.use("/auth", authRoutes);
app.use("/inventory", inventoryRoutes);
app.use("/marketplace", marketplaceRoutes);
app.use("/offers", offerRoutes);
app.use("/trades", tradeRoutes);
app.use("/wallet", walletRoutes);
app.use("/user", userRoutes);

// Steam Web API webhook endpoint
app.post("/api/webhooks/steam-trade", async (req, res) => {
  try {
    const webhookData = req.body;
    const signature = req.headers['x-steam-signature'];
    
    if (!signature) {
      console.warn("Webhook received without signature header");
      return res.status(401).json({ error: "Missing webhook signature" });
    }
    
    // Validate the webhook signature
    const crypto = require('crypto');
    const webhookSecret = process.env.STEAM_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error("STEAM_WEBHOOK_SECRET not configured");
      return res.status(500).json({ error: "Webhook validation not configured" });
    }
    
    // Create HMAC signature for validation
    const hmac = crypto.createHmac('sha256', webhookSecret);
    const computedSignature = hmac
      .update(JSON.stringify(webhookData))
      .digest('hex');
    
    if (computedSignature !== signature) {
      console.warn("Invalid webhook signature received");
      return res.status(401).json({ error: "Invalid webhook signature" });
    }
    
    // Process the webhook data
    const steamApiService = require("./services/steamApiService");
    const result = await steamApiService.processTradeWebhook(webhookData);
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return res.status(500).json({ error: "Failed to process webhook" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    error: "Server error",
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
  });
});

// Pick up PORT from .env or default to 5001
const PORT = process.env.PORT || 5001;

// Create HTTP server and integrate with Express
const server = http.createServer(app);

// Initialize Socket.io with proper CORS for deployment
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL 
      ? [process.env.CLIENT_URL] 
      : ["http://localhost:3000", "https://cs2-marketplace.onrender.com"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Use session middleware with Socket.io
const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
io.use(wrap(sessionMiddleware));
io.use(wrap(passport.initialize()));
io.use(wrap(passport.session()));

// WebSocket connection handling
io.on("connection", (socket) => {
  console.log(`New client connected: ${socket.id}`);
  
  // Authenticate the socket connection using session data
  if (socket.request.user) {
    const userId = socket.request.user._id;
    console.log(`Authenticated user ${userId} connected to socket ${socket.id}`);
    
    // Join user to their own room for targeted messages
    socket.join(`user:${userId}`);
    
    // Send welcome message to client
    socket.emit("connect_success", { message: "Successfully connected to WebSocket server" });
  } else {
    console.log(`Unauthenticated connection: ${socket.id}`);
    socket.emit("auth_error", { message: "Authentication required" });
  }
  
  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Initialize socket service
const socketService = require('./services/socketService');
socketService.init(io);

// Export io instance for use in other files
app.set('io', io);

// Start the server (only when not on Vercel)
if (process.env.VERCEL !== '1') {
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`WebSocket server initialized`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Export the Express API for Vercel
module.exports = app;

// Handle server error events (e.g., port in use)
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Please free it or use a different port.`
    );
    process.exit(1);
  } else {
    console.error("Server error:", err);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});
