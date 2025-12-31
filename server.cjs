const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   HEALTH
========================= */
app.get("/api/health", (req, res) => {
  res.json({ status: "Smart Pay running" });
});

/* =========================
   MONGODB + WALLET MODEL
========================= */
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ MONGO_URI missing");
  process.exit(1);
}

mongoose.connect(MONGO_URI).then(async () => {
  console.log("✅ MongoDB connected");

  // Drop legacy index if exists
  try {
    const col = mongoose.connection.db.collection("wallets");
    const indexes = await col.indexes();
    const phoneIdx = indexes.find(i => i.name === "phone_1");
    if (phoneIdx) {
      await col.dropIndex("phone_1");
      console.log("🧹 Dropped legacy phone_1 index");
    }
  } catch {}
});

// 🔥 FORCE SINGLE WALLET MODEL
let Wallet;
try {
  Wallet = mongoose.model("Wallet");
} catch {
  const WalletSchema = new mongoose.Schema(
    {
      owner: { type: String, required: true, unique: true },
      type: { type: String, enum: ["USER", "BUSINESS"], default: "USER" },
      balance: { type: Number, default: 0 }
    },
    { timestamps: true }
  );
  Wallet = mongoose.model("Wallet", WalletSchema);
}

/* =========================
   CREATE WALLET
========================= */
app.post("/api/wallet/create", async (req, res) => {
  try {
    const { owner, type = "USER" } = req.body;
    if (!owner) return res.status(400).json({ message: "Owner required" });

    let wallet = await Wallet.findOne({ owner });
    if (wallet) {
      return res.json({ message: "Wallet already exists", wallet });
    }

    wallet = await Wallet.create({ owner, type, balance: 0 });
    res.json({ message: "Wallet created", wallet });
  } catch (err) {
    console.error("❌ Wallet create error:", err.message);
    res.status(500).json({
      message: "Wallet creation failed",
      error: err.message
    });
  }
});

/* =========================
   GET WALLET
========================= */
app.get("/api/wallet/:owner", async (req, res) => {
  const wallet = await Wallet.findOne({ owner: req.params.owner });
  if (!wallet) return res.status(404).json({ message: "Wallet not found" });
  res.json(wallet);
});

/* =========================
   START
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Smart Pay running on port ${PORT}`);
});
