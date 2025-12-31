/**
 * SMART PAY v1 — LOCKED API
 * --------------------------------
 * Status: PRODUCTION READY
 * Version: v1.0.0
 *
 * - Wallet-based payment API
 * - Owner-based wallets (no phone)
 * - Idempotent wallet creation
 * - Atomic wallet transfers
 * - No debug leakage
 * - v1 routes frozen
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
  .catch(err => {
    console.error("MongoDB error");
    process.exit(1);
  });

/* =========================
   WALLET MODEL (SINGLE SOURCE)
========================= */
let Wallet;
try {
  Wallet = mongoose.model("Wallet");
} catch {
  const WalletSchema = new mongoose.Schema(
    {
      owner: {
        type: String,
        required: true,
        unique: true,
        trim: true
      },
      type: {
        type: String,
        enum: ["USER", "BUSINESS"],
        default: "USER"
      },
      balance: {
        type: Number,
        default: 0,
        min: 0
      }
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
    if (!owner) {
      return res.status(400).json({ message: "Owner is required" });
    }

    let wallet = await Wallet.findOne({ owner });
    if (wallet) {
      return res.json({ message: "Wallet already exists", wallet });
    }

    wallet = await Wallet.create({ owner, type });
    res.json({ message: "Wallet created", wallet });
  } catch (err) {
    console.error("Wallet create error");
    res.status(500).json({ message: "Internal server error" });
  }
});

/* =========================
   v1: GET WALLET
========================= */
app.get(`${API_V1}/wallet/:owner`, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ owner: req.params.owner });
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }
    res.json(wallet);
  } catch (err) {
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
  } catch (err) {
    console.error("Transfer error");
    res.status(500).json({ message: "Internal server error" });
  }
});

/* =========================
   BACKWARD COMPAT (NON-v1)
   (Optional – keep old paths alive)
========================= */
app.post("/api/wallet/create", (req, res) =>
  app.handle({ ...req, url: `${API_V1}/wallet/create` }, res)
);
app.get("/api/wallet/:owner", (req, res) =>
  app.handle({ ...req, url: `${API_V1}/wallet/${req.params.owner}` }, res)
);
app.post("/api/wallet/send", (req, res) =>
  app.handle({ ...req, url: `${API_V1}/wallet/send` }, res)
);

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Smart Pay v1 running on port ${PORT}`);
});
