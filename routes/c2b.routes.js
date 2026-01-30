const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

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
router.post("/confirmation", async (req, res) => {
  const data = req.body || {};

  // ✅ LOG IMMEDIATELY (THIS WILL ALWAYS SHOW)
  console.log("💰 C2B CONFIRMATION RECEIVED:", JSON.stringify(data));

  // ✅ ACK SAFARICOM IMMEDIATELY
  res.json({ ResultCode: 0, ResultDesc: "Success" });

  // 🔁 BACKGROUND WORK (SAFE)
  try {
    await C2BLog.create({
      transId: data.TransID || "UNKNOWN",
      payload: data
    });

    console.log("📦 C2B CALLBACK STORED");

  } catch (err) {
    console.error("❌ C2B STORAGE ERROR:", err.message);
  }
});

/* ===========================
   VALIDATION ENDPOINT
=========================== */
router.post("/validation", (req, res) => {
  console.log("🟡 C2B VALIDATION HIT:", JSON.stringify(req.body));
  res.json({ ResultCode: 0, ResultDesc: "Success" });
});

module.exports = router;
