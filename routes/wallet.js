const express = require("express");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const router = express.Router();

/* ============== MODELS ============== */
const Wallet = mongoose.model("Wallet");

/* ============== SET / UPDATE PIN ============== */
router.post("/set-pin", async (req, res) => {
  try {
    const { phone, pin } = req.body;

    if (!phone || !pin) {
      return res.status(400).json({ message: "phone and pin required" });
    }

    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({ message: "PIN must be 4 digits" });
    }

    const wallet = await Wallet.findOne({ owner: phone });
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    wallet.pinHash = await bcrypt.hash(pin, 10);
    await wallet.save();

    res.json({ success: true, message: "PIN set successfully" });
  } catch (err) {
    console.error("❌ SET PIN ERROR:", err);
    res.status(500).json({ message: "Failed to set PIN" });
  }
});

/* ============== GET BALANCE ============== */
router.get("/balance/:phone", async (req, res) => {
  const wallet = await Wallet.findOne({ owner: req.params.phone });
  res.json({ balance: wallet ? wallet.balance : 0 });
});

module.exports = router;
