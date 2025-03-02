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
  
  // Store the Render frontend URL so we can redirect back to it
  req.session.returnTo = "https://csp2p-1.onrender.com";
  console.log("Stored return URL in session:", req.session.returnTo);
  
  // Force creation of session before authentication
  req.session.save(() => {
    passport.authenticate("steam")(req, res, next);
  });
});

// @route GET /auth/steam/return
router.get(
  "/steam/return",
  passport.authenticate("steam", {
    failureRedirect: "https://csp2p-1.onrender.com",
    session: true
  }),
  (req, res) => {
    try {
      // Log user info to verify authentication worked
      console.log("Authenticated user:", req.user.steamId, req.user.displayName);
      console.log("Session ID after auth:", req.sessionID);
  
      // Make sure the user data is properly stored in the session
      req.session.userId = req.user._id;
      req.session.userAuthenticated = true;
      
      // Force session save before redirecting
      req.session.save((err) => {
        if (err) {
          console.error("Failed to save session:", err);
        }
        
        // Always redirect to the Render frontend
        res.redirect("https://csp2p-1.onrender.com");
      });
    } catch (err) {
      console.error("Error in auth return handler:", err);
      res.redirect("https://csp2p-1.onrender.com");
    }
  }
);

// @route GET /auth/user
router.get("/user", async (req, res) => {
  console.log("Auth check request received");
  console.log("Session ID:", req.sessionID);
  console.log("User in session:", req.user ? `Yes - ${req.user.steamId}` : "No");
  
  // First, check if we have a session with userId but no req.user
  if (req.session && req.session.userId && !req.user) {
    console.log("Found userId in session but missing req.user, attempting to restore user");
    try {
      const user = await User.findById(req.session.userId);
      if (user) {
        console.log("Successfully restored user from session userId");
        req.user = user;
      }
    } catch (e) {
      console.error("Failed to restore user from session:", e);
    }
  }
  
  // Now proceed with the normal flow
  if (req.user) {
    try {
      console.log(`Found user in session: ${req.user.displayName} (${req.user.steamId})`);
      
      // Always try to get a fresh copy from database
      try {
        const freshUser = await User.findById(req.user._id);
        if (freshUser) {
          console.log("Successfully retrieved fresh user data from database");
          req.user = freshUser;
        } else {
          // If the user doesn't exist in the database anymore, we need to check if this is a fresh auth
          console.log("User not found in database, checking Steam API...");
          
          // Try to get user from Steam API using steamId
          if (req.user.steamId) {
            try {
              const steamData = await steamApiService.getProfile(req.user.steamId);
              if (steamData && steamData.response && steamData.response.players && steamData.response.players.length > 0) {
                const steamUser = steamData.response.players[0];
                
                // Create a new user record
                const newUser = new User({
                  steamId: steamUser.steamid,
                  displayName: steamUser.personaname,
                  avatar: steamUser.avatarfull,
                  walletBalance: 0,
                  lastProfileUpdate: new Date()
                });
                
                await newUser.save();
                console.log("Created new user from Steam API data:", newUser._id);
                req.user = newUser;
              }
            } catch (steamError) {
              console.error("Error fetching user from Steam API:", steamError);
            }
          }
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
          tradeUrl: req.user.tradeUrl || null,
          tradeUrlExpiry: req.user.tradeUrlExpiry || null,
          walletBalance: req.user.walletBalance || 0,
          walletBalanceGEL: req.user.walletBalanceGEL || 0,
          lastProfileUpdate: req.user.lastProfileUpdate || new Date(),
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
