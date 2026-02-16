const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const fetch = require("node-fetch");

/* 🔥 VISIBILITY: FILE LOAD (NO LOGIC CHANGE) */
console.log("🔥 C2B ROUTES FILE LOADED");

/* ===========================
   RAW CALLBACK LOG (AUDIT)
   SMART PAY IS A PAYMENT RAIL
   NO BUSINESS LOGIC HERE
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
   SAFARICOM → SMART PAY
=========================== */
router.post("/confirmation", async (req, res) => {
  /* 🔥 VISIBILITY: HANDLER ENTRY (NO LOGIC CHANGE) */
  console.log("🔥🔥 CONFIRMATION HANDLER ENTERED");

  const data = req.body || {};

  /* 1️⃣ ALWAYS LOG (PROOF OF CALLBACK) */
  console.log("💰 C2B CONFIRMATION RECEIVED:", JSON.stringify(data));

  /* 2️⃣ ACK SAFARICOM IMMEDIATELY (NEVER FAIL) */
  res.json({ ResultCode: 0, ResultDesc: "Success" });

  /* 3️⃣ AUDIT STORAGE (NON-BLOCKING) */
  try {
    await C2BLog.create({
      transId: data.TransID || "UNKNOWN",
      payload: data,
      receivedAt: new Date()
    });

    console.log("📦 C2B CALLBACK STORED (AUDIT)");
  } catch (err) {
    console.error("❌ C2B STORAGE ERROR:", err.message);
  }

  /* 4️⃣ FORWARD EVENT TO SMART BIZ (INTERNAL) */
  try {
    if (!process.env.SMART_BIZ_URL || !process.env.CT_INTERNAL_KEY) {
      console.log("⚠️ Smart Biz integration not configured");
      return;
    }

    await fetch(
      `${process.env.SMART_BIZ_URL}/api/internal/orders/mark-paid`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-key": process.env.CT_INTERNAL_KEY
        },
        body: JSON.stringify({
          transId: data.TransID,
          amount: data.TransAmount,
          phone: data.MSISDN,
          raw: data
        })
      }
    );

    console.log("🔁 PAYMENT EVENT FORWARDED TO SMART BIZ");
  } catch (err) {
    console.error("❌ SMART BIZ FORWARD ERROR:", err.message);
  }
});

/* ===========================
   VALIDATION ENDPOINT
   SAFARICOM → SMART PAY
=========================== */
router.post("/validation", (req, res) => {
  console.log("🟡 C2B VALIDATION HIT:", JSON.stringify(req.body));
  res.json({ ResultCode: 0, ResultDesc: "Success" });
});

module.exports = router;
