const express = require("express");
const mongoose = require("mongoose");
const fetch = require("node-fetch");
const bcrypt = require("bcryptjs");
require("dotenv").config();

/* 🔧 FIX: sanitize SMART_BIZ_URL (DO NOT REMOVE) */
process.env.SMART_BIZ_URL = (process.env.SMART_BIZ_URL || "").trim();

const app = express();
app.use(express.json());

/* ================= DATABASE ================= */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Smart Pay DB connected"))
  .catch(err => {
    console.error("DB error:", err.message);
    process.exit(1);
  });

/* ================= MODELS ================= */
const WalletSchema = new mongoose.Schema({
  owner: String,
  balance: Number,
  pinHash: String
});

const Wallet = mongoose.model("Wallet", WalletSchema);

/* ================= HEALTH ================= */
app.get("/api/health", (req, res) => {
  res.json({ status: "SMART_PAY_OK" });
});

/* ================= SET PIN ================= */
app.post("/api/payments/set-pin", async (req, res) => {
  const { phone, pin } = req.body;

  const wallet = await Wallet.findOne({ owner: phone });
  if (!wallet) return res.status(404).json({ message: "Wallet not found" });

  wallet.pinHash = await bcrypt.hash(pin, 10);
  await wallet.save();

  res.json({ success: true });
});

/* ================= PAY ORDER ================= */
app.post("/api/payments/wallet", async (req, res) => {
  try {
    const { payer, amount, pin, orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: "Order required" });
    }

    /* VERIFY ORDER WITH SMART BIZ */
    const verifyRes = await fetch(
      `${process.env.SMART_BIZ_URL}/api/orders/${orderId}/verify`
    );
    const verify = await verifyRes.json();

    if (!verify.valid || verify.amount !== amount) {
      return res.status(400).json({ message: "Invalid order" });
    }

    const wallet = await Wallet.findOne({ owner: payer });
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });

    const pinOk = await bcrypt.compare(pin, wallet.pinHash);
    if (!pinOk) return res.status(401).json({ message: "Invalid PIN" });

    if (wallet.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    wallet.balance -= amount;
    await wallet.save();

    const reference =
      "TXN_" + Math.random().toString(16).slice(2, 10).toUpperCase();

    /* LOCK ORDER */
    await fetch(
      `${process.env.SMART_BIZ_URL}/api/orders/${orderId}/mark-paid`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentRef: reference })
      }
    );

    res.json({ success: true, reference });
  } catch (e) {
    console.error("PAY ERROR:", e);
    res.status(500).json({ message: "Payment failed" });
  }
});


/* ================= C2B CALLBACKS ================= */

// ROOT (heartbeat)
app.get("/", (req, res) => {
  res.send("AFRI SMART PAY API IS LIVE");
});

// VALIDATION
app.post("/api/c2b/validation", (req, res) => {
  console.log("🔥 C2B VALIDATION HIT");
  console.log(JSON.stringify(req.body, null, 2));

  return res.json({
    ResultCode: 0,
    ResultDesc: "Accepted"
  });
});

// CONFIRMATION
app.post("/api/c2b/confirmation", async (req, res) => {
  console.log("🔥 C2B CONFIRMATION HIT");
  console.log(JSON.stringify(req.body, null, 2));

  return res.json({
    ResultCode: 0,
    ResultDesc: "Received"
  });
});


/* ================= START ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Smart Pay running on ${PORT}`);
});

