const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

/* ===========================
   MODELS
   =========================== */
const Wallet = require("../models/Wallet");

/* ===========================
   RAW CALLBACK STORAGE MODEL
   =========================== */
const C2BLogSchema = new mongoose.Schema(
  {
    transId: { type: String, index: true, unique: true },
    amount: Number,
    shortCode: String,
    payload: Object,
    receivedAt: { type: Date, default: Date.now }
  },
  { strict: false }
);

const C2BLog =
  mongoose.models.C2BLog || mongoose.model("C2BLog", C2BLogSchema);

/* ===========================
   CONFIRMATION ENDPOINT
   =========================== */
router.post("/confirmation", (req, res) => {
  // 1️⃣ IMMEDIATE ACK TO SAFARICOM (DO NOT BLOCK)
  res.json({ ResultCode: 0, ResultDesc: "Success" });

  // 2️⃣ PROCESS ASYNC (SAFE FOR HIGH VOLUME)
  setImmediate(async () => {
    try {
      const data = req.body || {};

      console.log("💰 C2B CONFIRMATION RECEIVED:", JSON.stringify(data));

      const transId = data.TransID;
      const amount = Number(data.TransAmount || 0);
      const shortCode = data.BusinessShortCode;

      if (!transId || !amount || !shortCode) {
        console.warn("⚠️ Invalid C2B payload, skipping credit");
        return;
      }

      // 3️⃣ IDEMPOTENCY CHECK (NO DOUBLE CREDIT)
      const exists = await C2BLog.findOne({ transId });
      if (exists) {
        console.log("🔁 Duplicate callback ignored:", transId);
        return;
      }

      // 4️⃣ STORE RAW CALLBACK (AUDIT / CBK SAFE)
      await C2BLog.create({
        transId,
        amount,
        shortCode,
        payload: data
      });

      // 5️⃣ CREDIT BUSINESS WALLET (BY TILL SHORTCODE)
      const wallet = await Wallet.findOne({
        ownerType: "BUSINESS",
        mpesaShortCode: shortCode
      });

      if (!wallet) {
        console.error("❌ No wallet mapped to shortcode:", shortCode);
        return;
      }

      wallet.balance += amount;
      await wallet.save();

      console.log(
        `✅ Wallet credited | Wallet=${wallet._id} | Amount=${amount}`
      );

    } catch (err) {
      console.error("❌ C2B PROCESSING ERROR:", err.message);
    }
  });
});

/* ===========================
   VALIDATION ENDPOINT
   =========================== */
router.post("/validation", (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: "Success" });
});

module.exports = router;
