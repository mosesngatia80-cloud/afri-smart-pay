import express from "express";
import Wallet from "../models/Wallet.js";

const router = express.Router();

// =============================
// GET WALLET TRANSACTIONS
// =============================
router.get("/:phone", async (req, res) => {
  try {
    const { phone } = req.params;

    const wallet = await Wallet.findOne({ phone });
    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    res.json({
      phone: wallet.phone,
      balance: wallet.balance,
      transactions: wallet.transactions.reverse(), // latest first
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
