const express = require("express");
const mongoose = require("mongoose");
const Wallet = require("../models/Wallet");

const router = express.Router();

/**
 * 🔎 DEBUG ROUTE – PROVE THIS FILE IS LIVE
 */
router.get("/__debug_wallet_routes", (req, res) => {
  res.json({
    ok: true,
    service: "afri-smart-pay",
    file: "routes/wallet.js",
    time: new Date().toISOString()
  });
});

/**
 * 🚨 ADMIN: DROP LEGACY phone_1 INDEX
 */
router.get("/__drop_phone_index", async (req, res) => {
  try {
    const db = mongoose.connection.db;

    // Correct collection used by Smart Pay
    const collection = db.collection("wallets");

    const indexes = await collection.indexes();
    const phoneIndex = indexes.find(i => i.name === "phone_1");

    if (!phoneIndex) {
      return res.json({ message: "phone_1 index not found (already removed)" });
    }

    await collection.dropIndex("phone_1");
    res.json({ message: "phone_1 index dropped successfully" });
  } catch (err) {
    console.error("❌ Index drop error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * CREATE WALLET (IDEMPOTENT)
 */
router.post("/create", async (req, res) => {
  try {
    const { owner, type = "USER" } = req.body;

    if (!owner) {
      return res.status(400).json({ message: "Owner is required" });
    }

    let wallet = await Wallet.findOne({ owner });

    if (wallet) {
      return res.json({
        message: "Wallet already exists",
        wallet
      });
    }

    wallet = await Wallet.create({ owner, type });

    res.json({
      message: "Wallet created",
      wallet
    });
  } catch (err) {
    console.error("❌ Wallet create error:", err.message);
    res.status(500).json({ message: "Wallet creation failed" });
  }
});

/**
 * GET WALLET (KEEP LAST)
 */
router.get("/:owner", async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ owner: req.params.owner });
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }
    res.json(wallet);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
