import express from "express";
import auth from "../middleware/auth.js";
import Business from "../models/Business.js";

const router = express.Router();

/**
 * 🏢 CREATE BUSINESS
 */
router.post("/", auth, async (req, res) => {
  try {
    const { name, phone, location } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ message: "Name and phone are required" });
    }

    const existing = await Business.findOne({ owner: req.user._id });
    if (existing) {
      return res.status(400).json({ message: "Business already exists" });
    }

    const business = await Business.create({
      owner: req.user._id,
      name,
      phone,
      location
    });

    res.status(201).json(business);
  } catch (err) {
    res.status(500).json({ message: "Failed to create business" });
  }
});

/**
 * 🏢 GET MY BUSINESS
 */
router.get("/", auth, async (req, res) => {
  try {
    const business = await Business.findOne({ owner: req.user._id });

    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    res.json(business);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch business" });
  }
});

/**
 * 🔧 LINK WALLET (LOCAL – CORRECT ARCHITECTURE)
 */
router.post("/repair-wallet", auth, async (req, res) => {
  try {
    const business = await Business.findOne({ owner: req.user._id });

    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    if (business.walletId) {
      return res.json({
        message: "Wallet already linked",
        walletId: business.walletId
      });
    }

    // ✅ CREATE WALLET LOCALLY
    business.walletId = `SB_WALLET_${business._id}`;
    await business.save();

    res.json({
      message: "Wallet linked successfully",
      walletId: business.walletId
    });

  } catch (err) {
    res.status(500).json({
      message: "Wallet repair failed",
      error: err.message
    });
  }
});

/**
 * 💰 BUSINESS WITHDRAW (placeholder – can wire later)
 */
router.post("/withdraw", auth, async (req, res) => {
  res.json({ message: "Withdraw feature coming soon" });
});

export default router;
