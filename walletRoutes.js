const express = require("express");
const router = express.Router();
const Wallet = require("../models/Wallet");

// 🪙 Create Wallet
router.post("/create-wallet", async (req, res) => {
  try {
    const { name } = req.body;
    const wallet = new Wallet({ name, balance: 0 });
    await wallet.save();
    res.json({
      message: "Wallet created successfully!",
      wallet,
    });
  } catch (error) {
    res.status(500).json({ message: "Error creating wallet", error });
  }
});

// 🧾 Get Wallet by ID
router.get("/:id", async (req, res) => {
  try {
    const wallet = await Wallet.findById(req.params.id);
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });
    res.json(wallet);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

module.exports = router;
