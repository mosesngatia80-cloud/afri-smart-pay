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

  // 🔐 Security
  pinHash: String,

  // 🔒 Limits
  dailyWithdrawn: { type: Number, default: 0 },
  lastWithdrawDate: Date,

  // 🔑 OTP
  otpHash: String,
  otpExpiresAt: Date
});

const TransactionSchema = new mongoose.Schema({
  transId: { type: String, unique: true },
  owner: String,
  amount: Number,
  type: String,
  createdAt: { type: Date, default: Date.now }
});

const Wallet = mongoose.model("Wallet", WalletSchema);
const Transaction = mongoose.model("Transaction", TransactionSchema);

// =====================
// CONFIG
// =====================
const DAILY_LIMIT = 10000; // KES
const TX_LIMIT = 5000;     // KES
const OTP_TTL_MS = 2 * 60 * 1000; // 2 minutes

// =====================
// ROUTES
// =====================

// Health
app.get("/api/health", (req, res) => {
  res.json({ status: "Smart Pay LIVE 🚀" });
});

// Wallet balance
app.get("/api/wallet/:owner", async (req, res) => {
  const wallet = await Wallet.findOne({ owner: req.params.owner });
  if (!wallet) return res.status(404).json({ message: "Wallet not found" });
  res.json(wallet);
});

// =====================
// SET / UPDATE PIN
// =====================
app.post("/api/wallet/set-pin", async (req, res) => {
  const { owner, pin } = req.body;

  if (!owner || !pin || pin.length < 4) {
    return res.status(400).json({ message: "Invalid PIN" });
  }

  let wallet = await Wallet.findOne({ owner });
  if (!wallet) wallet = await Wallet.create({ owner, balance: 0 });

  wallet.pinHash = await bcrypt.hash(pin, 10);
  await wallet.save();

  res.json({ message: "PIN set successfully" });
});

// =====================
// C2B VALIDATION
// =====================
app.post("/api/c2b/validation", (req, res) => {
  return res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

// =====================
// C2B CONFIRMATION (UX SAFE)
// =====================
app.post("/api/c2b/confirmation", async (req, res) => {
  const { TransID, TransAmount, BillRefNumber } = req.body;

  if (!TransID || !TransAmount || !BillRefNumber) {
    return res.json({ ResultCode: 0, ResultDesc: "Ignored" });
  }

  const exists = await Transaction.findOne({ transId: TransID });
  if (exists) {
    return res.json({ ResultCode: 0, ResultDesc: "Duplicate" });
  }

  let wallet = await Wallet.findOne({ owner: BillRefNumber });
  if (!wallet) wallet = await Wallet.create({ owner: BillRefNumber, balance: 0 });

  wallet.balance += Number(TransAmount);
  await wallet.save();

  await Transaction.create({
    transId: TransID,
    owner: BillRefNumber,
    amount: Number(TransAmount),
    type: "C2B"
  });

  return res.json({ ResultCode: 0, ResultDesc: "Success" });
});

// =====================
// 🔑 REQUEST OTP (STEP 1)
// =====================
app.post("/api/b2c/request-otp", async (req, res) => {
  const { owner, amount, pin } = req.body;

  const wallet = await Wallet.findOne({ owner });
  if (!wallet) return res.status(404).json({ message: "Wallet not found" });

  if (!wallet.pinHash) {
    return res.status(403).json({ message: "PIN not set" });
  }

  const validPin = await bcrypt.compare(pin, wallet.pinHash);
  if (!validPin) {
    return res.status(403).json({ message: "Invalid PIN" });
  }

  const amt = Number(amount);
  if (amt > TX_LIMIT) {
    return res.status(403).json({ message: "Transaction limit exceeded" });
  }

  // Reset daily counter if new day
  const today = new Date().toDateString();
  if (!wallet.lastWithdrawDate || wallet.lastWithdrawDate.toDateString() !== today) {
    wallet.dailyWithdrawn = 0;
    wallet.lastWithdrawDate = new Date();
  }

  if (wallet.dailyWithdrawn + amt > DAILY_LIMIT) {
    return res.status(403).json({ message: "Daily limit exceeded" });
  }

  if (wallet.balance < amt) {
    return res.status(400).json({ message: "Insufficient balance" });
  }

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  wallet.otpHash = await bcrypt.hash(otp, 10);
  wallet.otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
  await wallet.save();

  console.log(`🔐 OTP for ${owner}: ${otp} (valid 2 minutes)`);

  res.json({ message: "OTP sent (check logs for now)" });
});

// =====================
// 💸 CONFIRM WITHDRAW (STEP 2)
// =====================
app.post("/api/b2c/confirm", async (req, res) => {
  const { owner, amount, otp } = req.body;

  const wallet = await Wallet.findOne({ owner });
  if (!wallet) return res.status(404).json({ message: "Wallet not found" });

  if (!wallet.otpHash || !wallet.otpExpiresAt) {
    return res.status(403).json({ message: "OTP not requested" });
  }

  if (wallet.otpExpiresAt < new Date()) {
    return res.status(403).json({ message: "OTP expired" });
  }

  const validOtp = await bcrypt.compare(otp, wallet.otpHash);
  if (!validOtp) {
    return res.status(403).json({ message: "Invalid OTP" });
  }

  const amt = Number(amount);
  if (wallet.balance < amt) {
    return res.status(400).json({ message: "Insufficient balance" });
  }

  // Debit + clear OTP
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
// SERVER
// =====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Smart Pay running on port ${PORT}`);
});
