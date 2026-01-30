const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

/* ===========================
   MODELS
=========================== */
const Order = require("../models/Order");
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
   CONFIRMATION ENDPOINT
=========================== */
router.post("/confirmation", (req, res) => {
  // 🔐 IMMEDIATE ACK — NEVER FAIL SAFARICOM
  res.json({ ResultCode: 0, ResultDesc: "Success" });

  // 🔁 NON-BLOCKING PROCESSING
  setImmediate(async () => {
    try {
      const data = req.body || {};
      console.log("💰 C2B CONFIRMATION:", JSON.stringify(data));

      // 1️⃣ LOG EVERYTHING (AUDIT TRAIL)
      await C2BLog.create({
        transId: data.TransID || "UNKNOWN",
        payload: data
      });

      const amount = Number(data.TransAmount);
      const phone  = data.MSISDN;
      const now    = new Date();

      if (!amount || !phone) {
        console.log("⚠️ Missing amount or phone, skipping reconciliation");
        return;
      }

      // 2️⃣ FIND MATCHING UNPAID ORDER (5-MIN WINDOW)
      const order = await Order.findOne({
        customerPhone: phone,
        total: amount,
        status: "UNPAID",
        createdAt: { $gte: new Date(now.getTime() - 5 * 60 * 1000) }
      });

      if (order) {
        // ✅ ORDER PAYMENT
        order.status = "PAID";
        order.paymentRef = data.TransID;
        order.paidAt = now;
        await order.save();

        console.log("✅ ORDER PAID:", order._id.toString());
        return;
      }

      // 3️⃣ NO ORDER → FUND BUSINESS WALLET
      const wallet = await Wallet.findOne({
        ownerType: "BUSINESS"
      });

      if (!wallet) {
        console.log("❌ No business wallet found");
        return;
      }

      wallet.balance += amount;
      await wallet.save();

      console.log("💳 WALLET FUNDED:", amount);

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
