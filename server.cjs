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

/* ============== MODELS ============== */
const WalletSchema = new mongoose.Schema(
  {
    owner: { type: String, unique: true },
    balance: { type: Number, default: 0 },
    pinHash: String
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
    type: String
  },
  { timestamps: true }
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

/* ============== HEALTH ============== */
app.get("/api/health", (req, res) => {
  res.json({ status: "PIN_AND_PAYMENTS_ACTIVE" });
});

/* ============== SET PIN (FINAL PATH) ============== */
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
    await wallet.save();

    res.json({ success: true, message: "PIN set successfully" });
  } catch (err) {
    console.error("❌ SET PIN ERROR:", err);
    res.status(500).json({ message: "Failed to set PIN" });
  }
});

/* ============== WALLET PAYMENT (PIN PROTECTED) ============== */
app.post("/api/payments/wallet", async (req, res) => {
  try {
    const { payer, business, amount, pin } = req.body;

    if (!payer || !business || !amount || !pin) {
      return res.status(400).json({ message: "missing fields" });
    }

    const payerWallet = await getOrCreateWallet(payer);
    const bizWallet = await getOrCreateWallet(business);
    const platformWallet = await getOrCreateWallet("PLATFORM_WALLET");

    if (!payerWallet.pinHash) {
      return res.status(403).json({ message: "PIN not set" });
    }

    const ok = await bcrypt.compare(pin, payerWallet.pinHash);
    if (!ok) {
      return res.status(403).json({ message: "Invalid PIN" });
    }

    let fee =
      amount <= 100 ? 0 :
      amount <= 1000 ? amount * 0.005 :
      amount * 0.01;

    fee = Math.min(Math.round(fee), 20);

    if (payerWallet.balance < amount + fee) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    const ref = "TXN_" + crypto.randomBytes(4).toString("hex").toUpperCase();

    payerWallet.balance -= amount + fee;
    bizWallet.balance += amount;
    platformWallet.balance += fee;

    await payerWallet.save();
    await bizWallet.save();
    await platformWallet.save();

    await Transaction.create({
      from: payer,
      to: business,
      amount,
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
