require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const app = express();
app.use(express.json());

// =====================
// DATABASE
// =====================
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.error("❌ MongoDB error:", err.message));

// =====================
// MODELS
// =====================
const WalletSchema = new mongoose.Schema({
  owner: { type: String, unique: true },
  balance: { type: Number, default: 0 },
  pinHash: String,
  frozen: { type: Boolean, default: false },
  dailyWithdrawn: { type: Number, default: 0 },
  lastWithdrawDate: String
});

const TransactionSchema = new mongoose.Schema({
  transId: String,
  owner: String,
  amount: Number,
  type: String,
  createdAt: { type: Date, default: Date.now }
});

const SystemSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  withdrawalsFrozen: { type: Boolean, default: false }
});

const Wallet = mongoose.model("Wallet", WalletSchema);
const Transaction = mongoose.model("Transaction", TransactionSchema);
const SystemConfig = mongoose.model("SystemConfig", SystemSchema);

// =====================
// HELPERS
// =====================
async function isSystemFrozen() {
  let config = await SystemConfig.findOne({ key: "GLOBAL" });
  if (!config) {
    config = await SystemConfig.create({ key: "GLOBAL", withdrawalsFrozen: false });
  }
  return config.withdrawalsFrozen;
}

// =====================
// ROUTES
// =====================
app.get("/api/health", (req, res) => {
  res.json({ status: "Smart Pay LIVE 🚀" });
});

// 🔒 ADMIN: GLOBAL FREEZE
app.post("/api/admin/freeze", async (req, res) => {
  const { freeze } = req.body;
  const config = await SystemConfig.findOneAndUpdate(
    { key: "GLOBAL" },
    { withdrawalsFrozen: freeze },
    { upsert: true, new: true }
  );
  res.json({ message: `Withdrawals ${freeze ? "FROZEN" : "UNFROZEN"}` });
});

// 🔒 ADMIN: FREEZE WALLET
app.post("/api/admin/freeze-wallet", async (req, res) => {
  const { owner, freeze } = req.body;
  await Wallet.updateOne({ owner }, { frozen: freeze });
  res.json({ message: `Wallet ${freeze ? "FROZEN" : "UNFROZEN"}` });
});

// 💳 GET WALLET
app.get("/api/wallet/:owner", async (req, res) => {
  const wallet = await Wallet.findOne({ owner: req.params.owner });
  if (!wallet) return res.status(404).json({ message: "Wallet not found" });
  res.json(wallet);
});

// =====================
// B2C WITHDRAW (SECURED)
// =====================
app.post("/api/b2c/withdraw", async (req, res) => {
  const { owner, amount, pin } = req.body;

  // 🔒 Global freeze check
  if (await isSystemFrozen()) {
    return res.status(403).json({ message: "Withdrawals temporarily suspended" });
  }

  const wallet = await Wallet.findOne({ owner });
  if (!wallet) return res.status(404).json({ message: "Wallet not found" });

  // 🔒 Wallet freeze
  if (wallet.frozen) {
    return res.status(403).json({ message: "Wallet is frozen" });
  }

  // 🔐 PIN check
  const ok = await bcrypt.compare(pin, wallet.pinHash || "");
  if (!ok) return res.status(401).json({ message: "Invalid PIN" });

  if (wallet.balance < amount) {
    return res.status(400).json({ message: "Insufficient balance" });
  }

  wallet.balance -= amount;
  await wallet.save();

  await Transaction.create({
    owner,
    amount,
    type: "B2C"
  });

  res.json({ message: "Withdrawal approved", amount });
});

// =====================
// SERVER
// =====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Smart Pay running on port ${PORT}`);
});
