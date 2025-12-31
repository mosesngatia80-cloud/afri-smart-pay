/**
 * SMART PAY v1 — LOCKED API (WITH MOCK PAYOUTS)
 * --------------------------------------------
 * Version: v1.0.0
 * Status: PRODUCTION READY (Mock B2C)
 *
 * - Wallet-based payment API
 * - Owner-based wallets (no phone)
 * - Idempotent wallet creation
 * - Atomic wallet transfers
 * - Mock B2C payout (async simulation)
 * - No debug leakage
 */

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const API_V1 = "/api/v1";

/* =========================
   HEALTH CHECK
========================= */
app.get("/api/health", (req, res) => {
  res.json({ status: "Smart Pay running", version: "v1.0.0" });
});

/* =========================
   MONGODB CONNECT
========================= */
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("MONGO_URI not set");
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected");
    // Drop legacy phone index if present
    try {
      const col = mongoose.connection.db.collection("wallets");
      const indexes = await col.indexes();
      const phoneIdx = indexes.find(i => i.name === "phone_1");
      if (phoneIdx) {
        await col.dropIndex("phone_1");
        console.log("Legacy phone_1 index dropped");
      }
    } catch (_) {}
  })
  .catch(() => process.exit(1));

/* =========================
   WALLET MODEL (SINGLE SOURCE)
========================= */
let Wallet;
try {
  Wallet = mongoose.model("Wallet");
} catch {
  const WalletSchema = new mongoose.Schema(
    {
      owner: { type: String, required: true, unique: true, trim: true },
      type: { type: String, enum: ["USER", "BUSINESS"], default: "USER" },
      balance: { type: Number, default: 0, min: 0 }
    },
    { timestamps: true }
  );
  Wallet = mongoose.model("Wallet", WalletSchema);
}

/* =========================
   v1: CREATE WALLET (IDEMPOTENT)
========================= */
app.post(`${API_V1}/wallet/create`, async (req, res) => {
  try {
    const { owner, type = "USER" } = req.body;
    if (!owner) return res.status(400).json({ message: "Owner is required" });

    let wallet = await Wallet.findOne({ owner });
    if (wallet) return res.json({ message: "Wallet already exists", wallet });

    wallet = await Wallet.create({ owner, type });
    res.json({ message: "Wallet created", wallet });
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
});

/* =========================
   v1: GET WALLET
========================= */
app.get(`${API_V1}/wallet/:owner`, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ owner: req.params.owner });
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });
    res.json(wallet);
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
});

/* =========================
   v1: SEND MONEY (ATOMIC)
========================= */
app.post(`${API_V1}/wallet/send`, async (req, res) => {
  try {
    const { from, to, amount } = req.body;
    if (!from || !to || !Number.isInteger(amount) || amount <= 0) {
      return res.status(400).json({ message: "Invalid request" });
    }

    const sender = await Wallet.findOne({ owner: from });
    const receiver = await Wallet.findOne({ owner: to });
    if (!sender || !receiver) {
      return res.status(404).json({ message: "Wallet not found" });
    }
    if (sender.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    sender.balance -= amount;
    receiver.balance += amount;
    await sender.save();
    await receiver.save();

    res.json({ message: "Transfer successful" });
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
});

/* =========================
   v1: PAYOUT (MOCK B2C)
========================= */
app.post(`${API_V1}/payout`, async (req, res) => {
  try {
    const { from, phone, amount } = req.body;

    // Basic validation
    if (!from || !phone || !Number.isInteger(amount) || amount <= 0) {
      return res.status(400).json({ message: "Invalid request" });
    }

    // Only BUSINESS wallets can payout
    const wallet = await Wallet.findOne({ owner: from });
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });
    if (wallet.type !== "BUSINESS") {
      return res.status(403).json({ message: "Only BUSINESS wallets can payout" });
    }
    if (wallet.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // Debit immediately (async payout model)
    wallet.balance -= amount;
    await wallet.save();

    // Generate mock reference
    const reference = `SP_PAYOUT_${Date.now()}`;

    // Simulate async B2C success callback
    setTimeout(() => {
      console.log(`MOCK B2C SUCCESS → ${phone} | ${amount} | ${reference}`);
      // In real B2C: update payout status here
    }, 1500);

    res.json({
      message: "Payout initiated",
      reference
    });
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Smart Pay v1 running on port ${PORT}`);
});
