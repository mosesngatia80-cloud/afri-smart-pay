const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const app = express();

/* ============== MIDDLEWARE ============== */
app.use(cors());
app.use(express.json());

/* ============== DATABASE ============== */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB error:", err.message);
    process.exit(1);
  });

/* ============== CONSTANTS ============== */
const MAX_PIN_ATTEMPTS = 3;
const LOCK_MINUTES = 15;
const DAILY_LIMIT = 5000; // KES per day

/* ============== MODELS ============== */
const WalletSchema = new mongoose.Schema(
  {
    owner: { type: String, unique: true },
    balance: { type: Number, default: 0 },
    pinHash: String,

    // limits & security
    pinAttempts: { type: Number, default: 0 },
    pinLockedUntil: Date,

    // daily limit tracking
    dailySpent: { type: Number, default: 0 },
    dailyResetAt: Date
  },
  { timestamps: true }
);

const TransactionSchema = new mongoose.Schema(
  {
    from: String,
    to: String,
    amount: Number,
    fee: Number,
    reference: String,
    type: String,
    createdAt: { type: Date, default: Date.now }
  }
);

const Wallet = mongoose.model("Wallet", WalletSchema);
const Transaction = mongoose.model("Transaction", TransactionSchema);

/* ============== HELPERS ============== */
async function getOrCreateWallet(owner) {
  let wallet = await Wallet.findOne({ owner });
  if (!wallet) {
    wallet = await Wallet.create({ owner, balance: 0 });
  }
  return wallet;
}

function resetDailyIfNeeded(wallet) {
  const now = new Date();
  if (!wallet.dailyResetAt || now >= wallet.dailyResetAt) {
    wallet.dailySpent = 0;
    const next = new Date();
    next.setHours(24, 0, 0, 0);
    wallet.dailyResetAt = next;
  }
}

/* ============== HEALTH ============== */
app.get("/api/health", (req, res) => {
  res.json({ status: "PIN_LIMITS_ACTIVE" });
});

/* ============== SET PIN ============== */
app.post("/api/payments/set-pin", async (req, res) => {
  try {
    const { phone, pin } = req.body;
    if (!phone || !pin) {
      return res.status(400).json({ message: "phone and pin required" });
    }
    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({ message: "PIN must be 4 digits" });
    }

    const wallet = await getOrCreateWallet(phone);
    wallet.pinHash = await bcrypt.hash(pin, 10);
    wallet.pinAttempts = 0;
    wallet.pinLockedUntil = null;
    await wallet.save();

    res.json({ success: true, message: "PIN set successfully" });
  } catch (err) {
    console.error("❌ SET PIN ERROR:", err);
    res.status(500).json({ message: "Failed to set PIN" });
  }
});

/* ============== WALLET PAYMENT (PIN + LIMITS) ============== */
app.post("/api/payments/wallet", async (req, res) => {
  try {
    const { payer, business, amount, pin } = req.body;
    if (!payer || !business || !amount || !pin) {
      return res.status(400).json({ message: "missing fields" });
    }

    const payerWallet = await getOrCreateWallet(payer);
    const bizWallet = await getOrCreateWallet(business);
    const platformWallet = await getOrCreateWallet("PLATFORM_WALLET");

    // lock check
    const now = new Date();
    if (payerWallet.pinLockedUntil && now < payerWallet.pinLockedUntil) {
      return res.status(403).json({
        message: "PIN locked. Try again later."
      });
    }

    // PIN must exist
    if (!payerWallet.pinHash) {
      return res.status(403).json({ message: "PIN not set" });
    }

    // PIN verify
    const ok = await bcrypt.compare(pin, payerWallet.pinHash);
    if (!ok) {
      payerWallet.pinAttempts += 1;
      if (payerWallet.pinAttempts >= MAX_PIN_ATTEMPTS) {
        payerWallet.pinLockedUntil = new Date(
          now.getTime() + LOCK_MINUTES * 60 * 1000
        );
        payerWallet.pinAttempts = 0;
      }
      await payerWallet.save();
      return res.status(403).json({ message: "Invalid PIN" });
    }

    // reset attempts on success
    payerWallet.pinAttempts = 0;
    payerWallet.pinLockedUntil = null;

    // daily limit
    resetDailyIfNeeded(payerWallet);
    if (payerWallet.dailySpent + Number(amount) > DAILY_LIMIT) {
      await payerWallet.save();
      return res.status(403).json({
        message: "Daily limit exceeded"
      });
    }

    // fees
    let fee =
      amount <= 100 ? 0 :
      amount <= 1000 ? amount * 0.005 :
      amount * 0.01;
    fee = Math.min(Math.round(fee), 20);

    if (payerWallet.balance < Number(amount) + fee) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // transfer
    const ref = "TXN_" + crypto.randomBytes(4).toString("hex").toUpperCase();

    payerWallet.balance -= Number(amount) + fee;
    bizWallet.balance += Number(amount);
    platformWallet.balance += fee;
    payerWallet.dailySpent += Number(amount);

    await payerWallet.save();
    await bizWallet.save();
    await platformWallet.save();

    await Transaction.create({
      from: payer,
      to: business,
      amount: Number(amount),
      fee,
      reference: ref,
      type: "WALLET_PAYMENT"
    });

    res.json({ success: true, reference: ref });
  } catch (err) {
    console.error("❌ PAYMENT ERROR:", err);
    res.status(500).json({ message: "Payment failed" });
  }
});

/* ============== START ============== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Smart Pay running on port ${PORT}`);
});
