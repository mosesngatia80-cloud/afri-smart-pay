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

  // security
  pinHash: String,
  frozen: { type: Boolean, default: false },

  // limits
  dailyWithdrawn: { type: Number, default: 0 },
  lastWithdrawDate: String,

  // otp
  otpHash: String,
  otpExpiresAt: Date
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
// CONFIG
// =====================
const DAILY_LIMIT = 10000;
const TX_LIMIT = 5000;
const OTP_TTL_MS = 2 * 60 * 1000;

// =====================
// HELPERS
// =====================
async function isSystemFrozen() {
  let cfg = await SystemConfig.findOne({ key: "GLOBAL" });
  if (!cfg) cfg = await SystemConfig.create({ key: "GLOBAL" });
  return cfg.withdrawalsFrozen;
}

// =====================
// ROUTES
// =====================
app.get("/api/health", (req, res) => {
  res.json({ status: "Smart Pay LIVE 🚀" });
});

// -------- ADMIN FREEZE --------
app.post("/api/admin/freeze", async (req, res) => {
  const { freeze } = req.body;
  await SystemConfig.findOneAndUpdate(
    { key: "GLOBAL" },
    { withdrawalsFrozen: freeze },
    { upsert: true }
  );
  res.json({ message: `Withdrawals ${freeze ? "FROZEN" : "UNFROZEN"}` });
});

app.post("/api/admin/freeze-wallet", async (req, res) => {
  const { owner, freeze } = req.body;
  await Wallet.updateOne({ owner }, { frozen: freeze });
  res.json({ message: `Wallet ${freeze ? "FROZEN" : "UNFROZEN"}` });
});

// -------- WALLET --------
app.get("/api/wallet/:owner", async (req, res) => {
  const wallet = await Wallet.findOne({ owner: req.params.owner });
  if (!wallet) return res.status(404).json({ message: "Wallet not found" });
  res.json(wallet);
});

app.post("/api/wallet/set-pin", async (req, res) => {
  const { owner, pin } = req.body;
  let wallet = await Wallet.findOne({ owner });
  if (!wallet) wallet = await Wallet.create({ owner });
  wallet.pinHash = await bcrypt.hash(pin, 10);
  await wallet.save();
  res.json({ message: "PIN set successfully" });
});

// -------- C2B --------
app.post("/api/c2b/validation", (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

app.post("/api/c2b/confirmation", async (req, res) => {
  const { TransID, TransAmount, BillRefNumber } = req.body;
  if (!TransID || !BillRefNumber) return res.json({ ResultCode: 0 });

  if (await Transaction.findOne({ transId: TransID })) {
    return res.json({ ResultCode: 0 });
  }

  let wallet = await Wallet.findOne({ owner: BillRefNumber });
  if (!wallet) wallet = await Wallet.create({ owner: BillRefNumber });

  wallet.balance += Number(TransAmount);
  await wallet.save();

  await Transaction.create({
    transId: TransID,
    owner: BillRefNumber,
    amount: Number(TransAmount),
    type: "C2B"
  });

  res.json({ ResultCode: 0, ResultDesc: "Success" });
});

// -------- OTP FLOW --------
app.post("/api/b2c/request-otp", async (req, res) => {
  const { owner, amount, pin } = req.body;

  if (await isSystemFrozen()) {
    return res.status(403).json({ message: "Withdrawals suspended" });
  }

  const wallet = await Wallet.findOne({ owner });
  if (!wallet || wallet.frozen) {
    return res.status(403).json({ message: "Wallet frozen" });
  }

  if (!(await bcrypt.compare(pin, wallet.pinHash || ""))) {
    return res.status(401).json({ message: "Invalid PIN" });
  }

  const amt = Number(amount);
  if (amt > TX_LIMIT) return res.status(403).json({ message: "TX limit exceeded" });

  const today = new Date().toDateString();
  if (wallet.lastWithdrawDate !== today) {
    wallet.dailyWithdrawn = 0;
    wallet.lastWithdrawDate = today;
  }

  if (wallet.dailyWithdrawn + amt > DAILY_LIMIT) {
    return res.status(403).json({ message: "Daily limit exceeded" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  wallet.otpHash = await bcrypt.hash(otp, 10);
  wallet.otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
  await wallet.save();

  console.log(`🔐 OTP for ${owner}: ${otp}`);
  res.json({ message: "OTP sent" });
});

app.post("/api/b2c/confirm", async (req, res) => {
  const { owner, amount, otp } = req.body;
  const wallet = await Wallet.findOne({ owner });

  if (!wallet || !wallet.otpHash) {
    return res.status(403).json({ message: "OTP not requested" });
  }

  if (wallet.otpExpiresAt < new Date()) {
    return res.status(403).json({ message: "OTP expired" });
  }

  if (!(await bcrypt.compare(otp, wallet.otpHash))) {
    return res.status(403).json({ message: "Invalid OTP" });
  }

  const amt = Number(amount);
  if (wallet.balance < amt) {
    return res.status(400).json({ message: "Insufficient balance" });
  }

  wallet.balance -= amt;
  wallet.dailyWithdrawn += amt;
  wallet.otpHash = null;
  wallet.otpExpiresAt = null;
  await wallet.save();

  await Transaction.create({
    transId: `B2C_${Date.now()}`,
    owner,
    amount: amt,
    type: "B2C"
  });

  res.json({ message: "Withdrawal approved", amount: amt });
});

// =====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Smart Pay running on ${PORT}`));
