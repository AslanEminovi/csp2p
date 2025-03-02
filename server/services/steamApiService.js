const axios = require("axios");
const User = require("../models/User");
const Item = require("../models/Item");
const Trade = require("../models/Trade");

// Base URL for Steam Web API
const STEAM_API_BASE_URL =
  process.env.STEAM_API_BASE_URL || "https://www.steamwebapi.com/steam/api";

// Helper function to check API key
const checkApiKey = () => {
  const STEAM_API_KEY = process.env.STEAMWEBAPI_KEY;
  if (!STEAM_API_KEY) {
    console.warn(
      "STEAMWEBAPI_KEY not provided - Steam API features will be unavailable"
    );
    return "dummy-key";
  }
  return STEAM_API_KEY;
};

// Steam WebAPI Service
const steamApiService = {
  /**
   * Get a user's Steam profile information
   * @param {string} steamId - The Steam ID to look up
   * @returns {Promise<Object>} - The user's profile data
   */
  async getProfile(steamId) {
    try {
      const STEAM_API_KEY = checkApiKey();
      if (STEAM_API_KEY === "dummy-key") {
        return {
          response: {
            personaname: "Demo User",
            avatarfull:
              "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg",
            profileurl: "https://steamcommunity.com/profiles/76561198000000000",
          },
        };
      }

      const response = await axios.get(`${STEAM_API_BASE_URL}/profile`, {
        params: {
          key: STEAM_API_KEY,
          id: steamId,
          state: "detailed",
          production: process.env.NODE_ENV === "production" ? 1 : 0,
          // Add cache busting parameter to force fresh data
          _nocache: Date.now(),
        },
      });

      return response.data;
    } catch (error) {
      console.error(
        "Steam API Profile Error:",
        error.response?.data || error.message
      );
      throw new Error("Failed to fetch Steam profile");
    }
  },

  /**
   * Update a user's profile in our database with fresh data from Steam
   * @param {string} userId - The MongoDB User ID
   * @returns {Promise<Object>} - The updated user
   */
  async refreshUserProfile(userId) {
    try {
      // Find user in our database
      const user = await User.findById(userId);
      if (!user || !user.steamId) {
        throw new Error("User not found or has no Steam ID");
      }

      // Get fresh profile data from Steam
      const profileData = await this.getProfile(user.steamId);

      if (!profileData || !profileData.response) {
        throw new Error("Invalid profile data received from Steam");
      }

      // Update user profile data with fresh data
      user.displayName = profileData.response.personaname || user.displayName;
      user.avatar = profileData.response.avatarfull || user.avatar;
      user.profileUrl = profileData.response.profileurl || user.profileUrl;
      user.lastProfileUpdate = new Date();

      // Save updated user to database
      await user.save();

      return user;
    } catch (error) {
      console.error("Refresh User Profile Error:", error.message);
      throw new Error(`Failed to refresh user profile: ${error.message}`);
    }
  },

  /**
   * Create a trade offer using Steam's API
   *
   * @param {string} steamLoginSecure - The user's steamLoginSecure token
   * @param {string} partnerSteamId - The Steam ID of the trade partner
   * @param {string} tradeLink - The trade link of the partner
   * @param {string} myItemAssetIds - Comma-separated list of asset IDs to send
   * @param {string} partnerItemAssetIds - Comma-separated list of asset IDs to receive
   * @param {string} message - Message to include with the trade offer
   * @returns {Promise<Object>} - The created trade offer data
   */
  async createTradeOffer(
    steamLoginSecure,
    partnerSteamId,
    tradeLink,
    myItemAssetIds,
    partnerItemAssetIds,
    message
  ) {
    try {
      const STEAM_API_KEY = checkApiKey();
      if (STEAM_API_KEY === "dummy-key") {
        return { success: false, message: "Steam API key not configured" };
      }

      const response = await axios.post(
        `${STEAM_API_BASE_URL}/trade/create?key=${STEAM_API_KEY}`,
        {
          steamloginsecure: steamLoginSecure,
          partneritemassetids: partnerItemAssetIds || "",
          myitemassetids: myItemAssetIds || "",
          tradelink: tradeLink,
          partnersteamid: partnerSteamId,
          message: message || "Trade offer from CS2 Marketplace Georgia",
          game: "cs2",
        }
      );

      return response.data;
    } catch (error) {
      console.error(
        "Create Trade Offer Error:",
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to create trade offer: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  },

  /**
   * Accept a trade offer using Steam's API
   *
   * @param {string} steamLoginSecure - The user's steamLoginSecure token
   * @param {string} tradeOfferId - The ID of the trade offer to accept
   * @param {string} partnerSteamId - The Steam ID of the trade partner
   * @returns {Promise<Object>} - The result of accepting the trade
   */
  async acceptTradeOffer(steamLoginSecure, tradeOfferId, partnerSteamId) {
    try {
      const STEAM_API_KEY = checkApiKey();
      const response = await axios.put(
        `${STEAM_API_BASE_URL}/trade/accept?key=${STEAM_API_KEY}`,
        {
          steamloginsecure: steamLoginSecure,
          tradeofferid: tradeOfferId,
          partnersteamid: partnerSteamId,
        }
      );

      return response.data;
    } catch (error) {
      console.error(
        "Accept Trade Offer Error:",
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to accept trade offer: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  },

  /**
   * Decline a trade offer using Steam's API
   *
   * @param {string} steamLoginSecure - The user's steamLoginSecure token
   * @param {string} tradeOfferId - The ID of the trade offer to decline
   * @returns {Promise<Object>} - The result of declining the trade
   */
  async declineTradeOffer(steamLoginSecure, tradeOfferId) {
    try {
      const STEAM_API_KEY = checkApiKey();
      const response = await axios.put(
        `${STEAM_API_BASE_URL}/trade/decline?key=${STEAM_API_KEY}`,
        {
          steamloginsecure: steamLoginSecure,
          tradeofferid: tradeOfferId,
        }
      );

      return response.data;
    } catch (error) {
      console.error(
        "Decline Trade Offer Error:",
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to decline trade offer: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  },

  /**
   * Cancel a trade offer using Steam's API
   *
   * @param {string} steamLoginSecure - The user's steamLoginSecure token
   * @param {string} tradeOfferId - The ID of the trade offer to cancel
   * @returns {Promise<Object>} - The result of canceling the trade
   */
  async cancelTradeOffer(steamLoginSecure, tradeOfferId) {
    try {
      const STEAM_API_KEY = checkApiKey();
      const response = await axios.put(
        `${STEAM_API_BASE_URL}/trade/cancel?key=${STEAM_API_KEY}`,
        {
          steamloginsecure: steamLoginSecure,
          tradeofferid: tradeOfferId,
        }
      );

      return response.data;
    } catch (error) {
      console.error(
        "Cancel Trade Offer Error:",
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to cancel trade offer: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  },

  /**
   * Get a list of sent trade offers
   *
   * @param {string} steamLoginSecure - The user's steamLoginSecure token
   * @returns {Promise<Array>} - List of sent trade offers
   */
  async getSentTradeOffers(steamLoginSecure) {
    try {
      const STEAM_API_KEY = checkApiKey();
      const response = await axios.post(
        `${STEAM_API_BASE_URL}/trade/sent?key=${STEAM_API_KEY}`,
        {
          steamloginsecure: steamLoginSecure,
          forcesteamids: 1, // Force Steam IDs to be included
        }
      );

      return response.data;
    } catch (error) {
      console.error(
        "Get Sent Trade Offers Error:",
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to get sent trade offers: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  },

  /**
   * Get a list of received trade offers
   *
   * @param {string} steamLoginSecure - The user's steamLoginSecure token
   * @returns {Promise<Array>} - List of received trade offers
   */
  async getReceivedTradeOffers(steamLoginSecure) {
    try {
      const response = await axios.post(
        `${STEAM_API_BASE_URL}/trade/received?key=${STEAM_API_KEY}`,
        {
          steamloginsecure: steamLoginSecure,
          forcesteamids: 1, // Force Steam IDs to be included
        }
      );

      return response.data;
    } catch (error) {
      console.error(
        "Get Received Trade Offers Error:",
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to get received trade offers: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  },

  /**
   * Process a trade webhook from Steam
   * Implements the business logic when a trade is completed/failed/etc.
   *
   * @param {Object} webhookData - The webhook data from Steam
   * @returns {Promise<Object>} - The result of processing the webhook
   */
  async processTradeWebhook(webhookData) {
    try {
      console.log("Processing trade webhook:", webhookData);

      // Find the trade in our database
      const trade = await Trade.findOne({
        tradeOfferId: webhookData.tradeofferid,
      });

      if (!trade) {
        console.error("Trade not found for webhook:", webhookData);
        throw new Error("Trade not found for webhook");
      }

      // Update trade status based on webhook status
      const newStatus = webhookData.status;
      trade.addStatusHistory(
        newStatus,
        `Webhook update: ${webhookData.message || ""}`
      );
      trade.webhookData = webhookData;

      // If trade is completed, update item ownership and process payment
      if (newStatus === "completed") {
        // Find the item
        const item = await Item.findById(trade.item);
        if (!item) {
          throw new Error("Item not found");
        }

        // Change ownership
        item.owner = trade.buyer;
        item.isListed = false;
        await item.save();

        // Process payment
        const seller = await User.findById(trade.seller);
        const buyer = await User.findById(trade.buyer);

        if (!seller || !buyer) {
          throw new Error("Buyer or seller not found");
        }

        // Apply platform fee (2.5%)
        const platformFee = trade.price * 0.025;
        const sellerReceives = trade.price - platformFee;

        // Update seller's wallet balance based on currency
        if (trade.currency === "USD") {
          seller.walletBalance =
            parseFloat(seller.walletBalance || 0) + sellerReceives;
        } else if (trade.currency === "GEL") {
          seller.walletBalanceGEL =
            parseFloat(seller.walletBalanceGEL || 0) + sellerReceives;
        }

        // Add transaction record to seller
        seller.transactions.push({
          type: "sale",
          amount: sellerReceives,
          currency: trade.currency,
          itemId: trade.item,
          status: "completed",
          reference: trade.tradeOfferId,
          completedAt: new Date(),
        });

        // Add notification to seller
        seller.notifications.push({
          type: "trade",
          title: "Item Sold",
          message: `Your item has been sold for ${trade.price} ${trade.currency}. You received ${sellerReceives} ${trade.currency} after fees.`,
          read: false,
          relatedItemId: trade.item,
          link: `/trade/${trade._id}`,
          createdAt: new Date(),
        });

        await seller.save();

        // Add notification to buyer
        buyer.transactions.push({
          type: "purchase",
          amount: -trade.price,
          currency: trade.currency,
          itemId: trade.item,
          status: "completed",
          reference: trade.tradeOfferId,
          completedAt: new Date(),
        });

        buyer.notifications.push({
          type: "trade",
          title: "Purchase Complete",
          message: `You have successfully purchased an item for ${trade.price} ${trade.currency}.`,
          read: false,
          relatedItemId: trade.item,
          link: `/trade/${trade._id}`,
          createdAt: new Date(),
        });

        await buyer.save();

        // Mark trade as completed
        trade.completedAt = new Date();
      } else if (
        newStatus === "failed" ||
        newStatus === "cancelled" ||
        newStatus === "declined"
      ) {
        // If trade failed, notify users
        const seller = await User.findById(trade.seller);
        const buyer = await User.findById(trade.buyer);

        if (seller) {
          seller.notifications.push({
            type: "trade",
            title: "Trade Failed",
            message: `Trade for your item has ${newStatus}. ${
              webhookData.message || ""
            }`,
            read: false,
            relatedItemId: trade.item,
            createdAt: new Date(),
          });
          await seller.save();
        }

        if (buyer) {
          buyer.notifications.push({
            type: "trade",
            title: "Trade Failed",
            message: `Trade for your purchase has ${newStatus}. ${
              webhookData.message || ""
            }`,
            read: false,
            relatedItemId: trade.item,
            createdAt: new Date(),
          });
          await buyer.save();
        }
      }

      await trade.save();
      return { success: true, status: newStatus };
    } catch (error) {
      console.error("Process Trade Webhook Error:", error);
      throw new Error(`Failed to process trade webhook: ${error.message}`);
    }
  },

  /**
   * Initialize trade history monitoring for a user
   *
   * @param {string} steamLoginSecure - The user's steamLoginSecure token
   * @param {string} webhookUrl - Webhook URL to receive trade history updates
   * @returns {Promise<Object>} - The result of initializing trade history
   */
  async initTradeHistory(steamLoginSecure, webhookUrl) {
    try {
      const response = await axios.post(
        `${STEAM_API_BASE_URL}/trade/history?key=${STEAM_API_KEY}`,
        {
          steamloginsecure: steamLoginSecure,
          webhook: webhookUrl,
        }
      );

      return response.data;
    } catch (error) {
      console.error(
        "Init Trade History Error:",
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to initialize trade history: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  },
};

module.exports = steamApiService;
