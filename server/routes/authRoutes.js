const express = require("express");
const passport = require("passport");
const router = express.Router();
const steamApiService = require("../services/steamApiService");
const User = require("../models/User");
const axios = require("axios");

// Debug middleware
router.use((req, res, next) => {
  console.log("Auth route accessed:", req.method, req.path);
  next();
});

// @route GET /auth/steam
router.get("/steam", (req, res, next) => {
  console.log("Steam auth request from:", req.headers.referer || "unknown");
  // Store the origin in the session for the return route
  if (req.headers.referer) {
    req.session.returnTo = req.headers.referer;
  }
  passport.authenticate("steam")(req, res, next);
});

// @route GET /auth/steam/return
router.get(
  "/steam/return",
  passport.authenticate("steam", {
    failureRedirect: process.env.CLIENT_URL || "https://csp2p-1.onrender.com",
  }),
  (req, res) => {
    // Successful authentication
    const clientUrl = process.env.CLIENT_URL || "https://csp2p-1.onrender.com";
    const returnTo = req.session.returnTo || clientUrl;
    console.log("Redirecting after auth to:", returnTo);

    // Clear the stored URL
    delete req.session.returnTo;

    // Redirect back to the client
    res.redirect(clientUrl);
  }
);

// @route GET /auth/user
router.get("/user", async (req, res) => {
  console.log("Auth check request received");
  console.log("Session ID:", req.sessionID);
  console.log("User in session:", req.user ? `Yes - ${req.user.steamId}` : "No");
  
  if (req.user) {
    try {
      console.log(`Found user in session: ${req.user.displayName} (${req.user.steamId})`);
      
      // Print debug info about this user
      console.log("User ID:", req.user._id);
      console.log("Display Name:", req.user.displayName);
      console.log("Avatar URL:", req.user.avatar);
      console.log("Last Update:", req.user.lastProfileUpdate);
      
      // Try to refresh the user from the database to ensure we have the latest data
      try {
        const freshUser = await User.findById(req.user._id);
        if (freshUser) {
          console.log("Successfully retrieved fresh user data from database");
          req.user = freshUser;
        } else {
          console.error("User exists in session but not in database!");
        }
      } catch (dbError) {
        console.error("Error fetching user from database:", dbError);
      }

      // Return user data
      res.json({
        authenticated: true,
        user: {
          id: req.user._id,
          steamId: req.user.steamId,
          displayName: req.user.displayName,
          avatar: req.user.avatar,
          tradeUrl: req.user.tradeUrl,
          tradeUrlExpiry: req.user.tradeUrlExpiry,
          walletBalance: req.user.walletBalance || 0,
          walletBalanceGEL: req.user.walletBalanceGEL || 0,
          lastProfileUpdate: req.user.lastProfileUpdate,
        },
      });
    } catch (error) {
      console.error("Error fetching user data:", error);
      res.status(500).json({ error: "Failed to fetch user data", details: error.message });
    }
  } else {
    console.log("No user found in session - not authenticated");
    
    // Debug session storage
    try {
      console.log("Session data:", req.session);
    } catch (e) {
      console.error("Error accessing session data:", e);
    }
    
    res.json({ authenticated: false });
  }
});

// @route GET /auth/refresh-profile
// Manually force a profile refresh
router.get("/refresh-profile", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  try {
    const refreshedUser = await steamApiService.refreshUserProfile(
      req.user._id
    );

    res.json({
      success: true,
      user: {
        id: refreshedUser._id,
        steamId: refreshedUser.steamId,
        displayName: refreshedUser.displayName,
        avatar: refreshedUser.avatar,
        lastProfileUpdate: refreshedUser.lastProfileUpdate,
      },
    });
  } catch (error) {
    console.error("Manual profile refresh error:", error);
    res.status(500).json({
      error: "Failed to refresh profile",
      message: error.message,
    });
  }
});

// @route GET /auth/logout
router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to logout" });
    }
    res.sendStatus(200);
  });
});

module.exports = router;
