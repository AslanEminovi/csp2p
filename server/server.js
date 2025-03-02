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
const crypto = require("crypto");

// Generate default secrets if not provided
const SESSION_SECRET =
  process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const STEAM_WEBHOOK_SECRET =
  process.env.STEAM_WEBHOOK_SECRET || crypto.randomBytes(32).toString("hex");

// Suppress the Mongoose strictQuery warning for Mongoose 7
mongoose.set("strictQuery", false);

const { connectDB } = require("./config/db"); // Import MongoDB connection function
// Connect to MongoDB immediately
connectDB();
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
    origin: ["https://csp2p-1.onrender.com"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    exposedHeaders: ["set-cookie"]
  })
);

// Increased body size limit for larger payloads (e.g., when submitting multiple items)
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

// Express session configuration (required by Passport)
const sessionMiddleware = session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    secure: process.env.NODE_ENV === "production", // Only use secure cookies in production
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    httpOnly: true,
  },
  name: "cs2marketplace.sid",
});

app.use(sessionMiddleware);

// Initialize Passport and restore authentication state
app.use(passport.initialize());
app.use(passport.session());

// API Routes - Move these BEFORE the React routing handler
app.use("/api/auth", authRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/trades", tradeRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/user", userRoutes);

// Steam Web API webhook endpoint
app.post("/api/webhooks/steam-trade", async (req, res) => {
  try {
    const webhookData = req.body;
    const signature = req.headers["x-steam-signature"];

    if (!signature) {
      console.warn("Webhook received without signature header");
      return res.status(401).json({ error: "Missing webhook signature" });
    }

    // Validate the webhook signature
    const webhookSecret = STEAM_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("STEAM_WEBHOOK_SECRET not configured");
      return res
        .status(500)
        .json({ error: "Webhook validation not configured" });
    }

    // Create HMAC signature for validation
    const hmac = crypto.createHmac("sha256", webhookSecret);
    const computedSignature = hmac
      .update(JSON.stringify(webhookData))
      .digest("hex");

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

// Handle React routing in production
if (process.env.NODE_ENV === "production") {
  // Serve static files from the React app
  app.use(express.static(path.join(__dirname, "../client/build")));

  // Handle non-API routes by serving the React app
  app.get("*", (req, res, next) => {
    // Log the request path for debugging
    console.log("Incoming request path:", req.path);

    if (req.path.startsWith("/api/")) {
      console.log("Forwarding to API routes:", req.path);
      return next();
    }
    console.log("Serving React app for path:", req.path);
    res.sendFile(path.join(__dirname, "../client/build", "index.html"));
  });
} else {
  // Development welcome route
  app.get("/", (req, res) => {
    res.json({
      message: "CS2 Marketplace API Server",
      environment: process.env.NODE_ENV || "development",
      status: "running",
    });
  });
}

// Handle 404 for API routes - Move this AFTER all other routes
app.use("/api/*", (req, res) => {
  console.log(
    "404 API route not found:",
    req.originalUrl,
    "Method:",
    req.method
  );
  console.log("Headers:", req.headers);
  res.status(404).json({ error: "API endpoint not found" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    error: "Server error",
    message:
      process.env.NODE_ENV === "production"
        ? "An unexpected error occurred"
        : err.message,
  });
});

// Pick up PORT from environment variable (Render.com will set this automatically)
const PORT = process.env.PORT || 10000;

// Create HTTP server and integrate with Express
const server = http.createServer(app);

// Initialize Socket.io with proper CORS for deployment
const io = new Server(server, {
  cors: {
    origin: ["https://csp2p-1.onrender.com", "https://csp2p.onrender.com"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Use session middleware with Socket.io
const wrap = (middleware) => (socket, next) =>
  middleware(socket.request, {}, next);
io.use(wrap(sessionMiddleware));
io.use(wrap(passport.initialize()));
io.use(wrap(passport.session()));

// WebSocket connection handling
io.on("connection", (socket) => {
  console.log(`New client connected: ${socket.id}`);

  // Authenticate the socket connection using session data
  if (socket.request.user) {
    const userId = socket.request.user._id;
    console.log(
      `Authenticated user ${userId} connected to socket ${socket.id}`
    );

    // Join user to their own room for targeted messages
    socket.join(`user:${userId}`);

    // Send welcome message to client
    socket.emit("connect_success", {
      message: "Successfully connected to WebSocket server",
    });
  } else {
    console.log(`Unauthenticated connection: ${socket.id}`);
    socket.emit("auth_error", { message: "Authentication required" });
  }

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Initialize socket service
const socketService = require("./services/socketService");
socketService.init(io);

// Export io instance for use in other files
app.set("io", io);

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log("WebSocket server initialized");
});
