const passport = require("passport");
const SteamStrategy = require("passport-steam").Strategy;
const User = require("../models/User");

passport.serializeUser((user, done) => {
  console.log("Serializing user:", user.id);
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  console.log("Deserializing user ID:", id);
  try {
    const user = await User.findById(id);
    if (user) {
      console.log("User found during deserialization:", user.displayName);
      done(null, user);
    } else {
      console.error("User not found during deserialization!");
      done(null, null);
    }
  } catch (err) {
    console.error("Error during deserialization:", err);
    done(err);
  }
});

passport.use(
  new SteamStrategy(
    {
      returnURL: "https://csp2p.onrender.com/api/auth/steam/return",
      realm: "https://csp2p.onrender.com",
      apiKey: process.env.STEAM_API_KEY || "F754A63D38C9F63C247615D6F88D868C",
    },
    async (identifier, profile, done) => {
      try {
        // Extract the Steam ID from the profile data
        const steamId = profile._json.steamid;
        // Find or create the user in your database
        let user = await User.findOne({ steamId });

        if (!user) {
          // Create new user if not found
          user = await User.create({
            steamId,
            displayName: profile.displayName,
            avatar: profile._json.avatarfull,
            walletBalance: 0,
            lastProfileUpdate: new Date(),
          });
        } else {
          // Always update profile information on login to ensure it's current
          user.displayName = profile.displayName;
          user.avatar = profile._json.avatarfull;
          user.lastProfileUpdate = new Date();

          // If there are other profile fields to update, do it here
          if (profile._json.profileurl) {
            user.profileUrl = profile._json.profileurl;
          }

          await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);
