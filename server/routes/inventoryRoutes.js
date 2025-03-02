const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventoryController");
const requireAuth = require("../middleware/requireAuth");

// Get user's Steam inventory from steamwebapi.com
router.get("/my", requireAuth, inventoryController.getUserInventory);

module.exports = router;
