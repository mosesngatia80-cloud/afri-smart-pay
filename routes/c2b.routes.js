const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

/* ===========================
   MODELS (SMART PAY ONLY)
=========================== */
const Wallet = require("../models/Wallet");

/* ===========================
   RAW CALLBACK LOG (AUDIT)
=========================== */
const C2BLogSchema = new mongoose.Schema(
  {
    transId: { type: String, index: true },
    payload: Object,
    receivedAt: { type: Date, default: Date.now }
  },
  { strict: false }
);

const C2BLog =
  mongoose.models.C2BLog || mongoose.model("C2BLog", C2BLogSchema);

/* ===========================
   C2B CONFIRMATION ENDPOINT
=========================== */
router.post("/confirmation", (req, res) => {
  // ✅ IMMEDIATE ACK — NEVER FAIL SAFARICOM
  res.json({ ResultCode: 0, ResultDesc: "Success" });

  // 🔁 ASYNC NON-BLOCKING PROCESSING
  setImmediate(async () => {
    try {
      const data = req.body || {};

      console.log("💰 C2B CONFIRMATION:", JSON.stringify(data));

      // 1️⃣ LOG EVERY CALLBACK (NO FILTERING, NO DEDUP)
      await C2BLog.create({
        transId: data.TransID || "UNKNOWN",
        payload: data,
        receivedAt: new Date()
      });

      const amount = Number(data.TransAmount);
      const shortcode = data.BusinessShortCode;

      if (!amount || !shortcode) {
        console.log("⚠️ Missing amount or shortcode — logged only");
        return;
      }

      // 2️⃣ FUND BUSINESS WALLET (SMART PAY RESPONSIBILITY)
      const wallet = await Wallet.findOne({
        ownerType: "BUSINESS",
        shortcode
      });

      if (!wallet) {
        console.log("⚠️ No business wallet found for shortcode:", shortcode);
        return;
      }

      wallet.balance += amount;
      await wallet.save();

      console.log("💳 WALLET FUNDED:", {
        walletId: wallet._id.toString(),
        amount
      });

      // 3️⃣ (OPTIONAL — PHASE 2)
      // Emit event or notify Smart Biz via API
      // Example:
      // await fetch("https://smartbiz/api/internal/payment-event", {...})

    } catch (err) {
      console.error("❌ C2B PROCESSING ERROR:", err.message);
    }
  });
});

/* ===========================
   C2B VALIDATION ENDPOINT
=========================== */
router.post("/validation", (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: "Success" });
});

module.exports = router;
