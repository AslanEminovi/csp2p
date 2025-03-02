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

// Define Steam OpenID constants
const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login';
const CLIENT_URL = 'https://csp2p-1.onrender.com';
const API_URL = 'https://csp2p.onrender.com';
const STEAM_API_KEY = process.env.STEAM_API_KEY || 'F754A63D38C9F63C247615D6F88D868C';

// @route GET /auth/steam
router.get("/steam", (req, res) => {
  console.log("Steam auth request received");
  
  const returnUrl = `${API_URL}/api/auth/steam/return`;
  const realm = API_URL;
  
  // Create OpenID parameters
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': returnUrl,
    'openid.realm': realm,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
  });

  console.log("Redirecting to Steam OpenID:", `${STEAM_OPENID_URL}?${params.toString()}`);
  
  // Redirect to Steam OpenID
  res.redirect(`${STEAM_OPENID_URL}?${params.toString()}`);
});

// @route GET /auth/steam/return
router.get("/steam/return", async (req, res) => {
  console.log("Steam OpenID return received");
  
  try {
    if (req.query['openid.mode'] !== 'id_res') {
      console.error("Invalid OpenID response");
      return res.redirect(`${CLIENT_URL}/login-failed`);
    }
    
    // Extract SteamID from claimed_id
    const claimedId = req.query['openid.claimed_id'];
    const steamIdMatch = claimedId.match(/\/id\/(\d+)$/);
    
    if (!steamIdMatch) {
      console.error("Could not extract SteamID from:", claimedId);
      return res.redirect(`${CLIENT_URL}/login-failed`);
    }
    
    const steamId = steamIdMatch[1];
    console.log("Successfully extracted SteamID:", steamId);
    
    // Validate the response with Steam
    const params = new URLSearchParams();
    for (const key in req.query) {
      params.append(key, req.query[key]);
    }
    params.set('openid.mode', 'check_authentication');
    
    const validationResponse = await axios.post(STEAM_OPENID_URL, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    if (!validationResponse.data.includes('is_valid:true')) {
      console.error("Steam OpenID validation failed:", validationResponse.data);
      return res.redirect(`${CLIENT_URL}/login-failed`);
    }
    
    // Get user details from Steam API
    const steamUserUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId}`;
    const steamResponse = await axios.get(steamUserUrl);
    const userData = steamResponse.data.response.players[0];
    
    if (!userData) {
      console.error("Could not fetch user data from Steam API");
      return res.redirect(`${CLIENT_URL}/login-failed`);
    }
    
    console.log("Steam user data retrieved:", {
      steamId: userData.steamid,
      name: userData.personaname,
      avatar: userData.avatarfull
    });
    
    // Find or create user in database
    let user = await User.findOne({ steamId: userData.steamid });
    
    if (!user) {
      // Create new user
      user = await User.create({
        steamId: userData.steamid,
        displayName: userData.personaname,
        avatar: userData.avatarfull,
        walletBalance: 0,
        lastProfileUpdate: new Date(),
      });
      console.log("New user created:", user._id);
    } else {
      // Update existing user
      user.displayName = userData.personaname;
      user.avatar = userData.avatarfull;
      user.lastProfileUpdate = new Date();
      await user.save();
      console.log("Existing user updated:", user._id);
    }
    
    // Log in the user
    req.login(user, (err) => {
      if (err) {
        console.error("Error during login:", err);
        return res.redirect(`${CLIENT_URL}/login-failed`);
      }
      
      console.log("User successfully authenticated:", user.displayName);
      
      // Redirect back to client
      return res.redirect(CLIENT_URL);
    });
    
  } catch (error) {
    console.error("Error processing Steam authentication:", error);
    res.redirect(`${CLIENT_URL}/login-failed`);
  }
});

// @route GET /auth/user
router.get("/user", async (req, res) => {
  if (req.user) {
    try {
      // Automatically refresh the user's profile if it hasn't been updated in the last hour
      const lastUpdateTime = req.user.lastProfileUpdate
        ? new Date(req.user.lastProfileUpdate)
        : null;
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      if (!lastUpdateTime || lastUpdateTime < oneHourAgo) {
        // Try to refresh profile data from Steam
        try {
          await steamApiService.refreshUserProfile(req.user._id);
          // Reload user from database to get fresh data
          req.user = await User.findById(req.user._id);
        } catch (refreshError) {
          console.error("Profile auto-refresh failed:", refreshError);
          // Continue with existing data if refresh fails
        }
      }

      res.json({
        authenticated: true,
        user: {
          id: req.user._id,
          steamId: req.user.steamId,
          displayName: req.user.displayName,
          avatar: req.user.avatar,
          tradeUrl: req.user.tradeUrl,
          tradeUrlExpiry: req.user.tradeUrlExpiry,
          walletBalance: req.user.walletBalance,
          walletBalanceGEL: req.user.walletBalanceGEL,
          lastProfileUpdate: req.user.lastProfileUpdate,
        },
      });
    } catch (error) {
      console.error("Error fetching user data:", error);
      res.status(500).json({ error: "Failed to fetch user data" });
    }
  } else {
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
