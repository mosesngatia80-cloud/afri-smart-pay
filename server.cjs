const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();

const app = express();

/* ===================== MIDDLEWARE ===================== */
app.use(cors());
app.use(bodyParser.json());

/* ===================== HEALTH CHECK ===================== */
app.get("/", (req, res) => {
  res.send("🚀 Afri Smart Pay API is LIVE");
});

/* ===================== MONGODB ===================== */
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI missing");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ MongoDB Error:", err.message);
    process.exit(1);
  });

/* ===================== WALLET MODEL ===================== */
const walletSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true },
    balance: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const Wallet = mongoose.models.Wallet || mongoose.model("Wallet", walletSchema);

/* ===================== ROUTES ===================== */

/**
 * POST /api/check-balance
 * body: { phone }
 */
app.post("/api/check-balance", async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, error: "Phone required" });
    }

    let wallet = await Wallet.findOne({ phone });
    if (!wallet) {
      wallet = await Wallet.create({ phone, balance: 0 });
    }

    res.json({
      success: true,
      phone: wallet.phone,
      balance: wallet.balance
    });
  } catch (err) {
    console.error("❌ check-balance:", err.message);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

/**
 * POST /api/send-money
 * body: { from, to, amount }
 */
app.post("/api/send-money", async (req, res) => {
  try {
    const { from, to, amount } = req.body;

    if (!from || !to || !amount) {
      return res.status(400).json({ success: false, error: "Missing fields" });
    }

    if (from === to) {
      return res.status(400).json({ success: false, error: "Cannot send to self" });
    }

    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({ success: false, error: "Invalid amount" });
    }

    const sender = await Wallet.findOne({ phone: from });
    if (!sender) {
      return res.status(404).json({ success: false, error: "Sender wallet not found" });
    }

    if (sender.balance < amt) {
      return res.status(400).json({ success: false, error: "Insufficient balance" });
    }

    let receiver = await Wallet.findOne({ phone: to });
    if (!receiver) {
      receiver = await Wallet.create({ phone: to, balance: 0 });
    }

    sender.balance -= amt;
    receiver.balance += amt;

    await sender.save();
    await receiver.save();

    res.json({
      success: true,
      message: "Transfer successful",
      from,
      to,
      amount: amt,
      balance: sender.balance
    });
  } catch (err) {
    console.error("❌ send-money:", err.message);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

/* ===================== START SERVER ===================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🔥 Afri Smart Pay running on port ${PORT}`);
});
