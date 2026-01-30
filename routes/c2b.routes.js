const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

/* ===========================
   RAW CALLBACK LOG (AUDIT)
   DO NOT ADD BUSINESS LOGIC HERE
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
  const data = req.body || {};

  // 🔴 1️⃣ ALWAYS LOG — THIS PROVES CALLBACK RECEIPT
  console.log("💰 C2B CONFIRMATION RECEIVED:", JSON.stringify(data));

  // 🔴 2️⃣ ACK SAFARICOM IMMEDIATELY (CRITICAL)
  // Never block, never validate, never throw
  res.json({ ResultCode: 0, ResultDesc: "Success" });

  // 🟡 3️⃣ BACKGROUND STORAGE (AUDIT TRAIL)
  // No business logic here by design
  try {
    await C2BLog.create({
      transId: data.TransID || "UNKNOWN",
      payload: data,
      receivedAt: new Date()
    });

    console.log("📦 C2B CALLBACK STORED (AUDIT ONLY)");
  } catch (err) {
    // Even storage errors must NOT affect Safaricom
    console.error("❌ C2B STORAGE ERROR:", err.message);
  }
});

/* ===========================
   VALIDATION ENDPOINT
   SAFARICOM → SMART PAY
=========================== */
router.post("/validation", (req, res) => {
  console.log("🟡 C2B VALIDATION HIT:", JSON.stringify(req.body));

  // Always approve at Smart Pay layer
  res.json({ ResultCode: 0, ResultDesc: "Success" });
});

module.exports = router;
