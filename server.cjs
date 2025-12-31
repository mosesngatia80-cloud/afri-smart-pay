/**
 * SMART PAY – API SERVER (FINAL)
 * --------------------------------
 * - API-only service
 * - Wallets identified by `owner`
 * - USER and BUSINESS wallets supported
 * - Legacy phone logic fully removed
 */

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   HEALTH CHECK
========================= */
app.get("/api/health", (req, res) => {
  res.json({ status: "Smart Pay running" });
});

/* =========================
   MONGODB CONNECT
========================= */
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ MONGO_URI not set");
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB connected");

    // 🔥 Drop legacy phone index if it exists
    try {
      const collection = mongoose.connection.db.collection("wallets");
      const indexes = await collection.indexes();
      const phoneIndex = indexes.find(i => i.name === "phone_1");

      if (phoneIndex) {
        await collection.dropIndex("phone_1");
        console.log("🧹 Dropped legacy phone_1 index");
      }
    } catch (err) {
      console.log("ℹ️ Index cleanup skipped:", err.message);
    }
  })
  .catch(err => {
    console.error("❌ MongoDB error:", err.message);
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
        default: 0
      }
    },
    { timestamps: true }
  );

  Wallet = mongoose.model("Wallet", WalletSchema);
}

/* =========================
   CREATE WALLET (IDEMPOTENT)
========================= */
app.post("/api/wallet/create", async (req, res) => {
  try {
    const { owner, type = "USER" } = req.body;

    if (!owner) {
      return res.status(400).json({ message: "Owner is required" });
    }

    let wallet = await Wallet.findOne({ owner });
    if (wallet) {
      return res.json({
        message: "Wallet already exists",
        wallet
      });
    }

    wallet = await Wallet.create({ owner, type });
    res.json({
      message: "Wallet created",
      wallet
    });
  } catch (err) {
    console.error("❌ Wallet create error:", err.message);
    res.status(500).json({ message: "Wallet creation failed" });
  }
});

/* =========================
   GET WALLET BY OWNER
========================= */
app.get("/api/wallet/:owner", async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ owner: req.params.owner });
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }
    res.json(wallet);
  } catch (err) {
    res.status(500).json({ message: "Error fetching wallet" });
  }
});

/* =========================
   SEND MONEY
========================= */
app.post("/api/wallet/send", async (req, res) => {
  try {
    const { from, to, amount } = req.body;

    if (!from || !to || typeof amount !== "number") {
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
    console.error("❌ Transfer error:", err.message);
    res.status(500).json({ message: "Transfer failed" });
  }
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Smart Pay running on port ${PORT}`);
});
