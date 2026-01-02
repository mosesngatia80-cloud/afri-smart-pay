/* =======================
   AFRI SMART PAY SERVER
   ======================= */

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

/* =======================
   ENV
   ======================= */
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "production";

/* =======================
   DB CONNECT (FIXED)
   ======================= */
const MONGO_URI =
  process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error("❌ MongoDB URI missing");
}

mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error", err));

/* =======================
   MODELS
   ======================= */
const WalletSchema = new mongoose.Schema({
  owner: { type: String, unique: true },
  balance: { type: Number, default: 0 }
});

const TransactionSchema = new mongoose.Schema({
  type: String,
  owner: String,
  amount: Number,
  reference: String,
  createdAt: { type: Date, default: Date.now }
});

const Wallet = mongoose.model("Wallet", WalletSchema);
const Transaction = mongoose.model("Transaction", TransactionSchema);

/* =======================
   GLOBAL STATE
   ======================= */
let withdrawalsFrozen = false;
const otpStore = new Map();

/* =======================
   HEALTH
   ======================= */
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", env: NODE_ENV });
});

/* =======================
   ADMIN FREEZE
   ======================= */
app.post("/api/admin/freeze", (req, res) => {
  withdrawalsFrozen = !!req.body.freeze;
  res.json({
    message: withdrawalsFrozen
      ? "Withdrawals FROZEN"
      : "Withdrawals UNFROZEN"
  });
});

/* =======================
   WALLET CREATE
   ======================= */
app.post("/api/wallet/create", async (req, res) => {
  const { owner } = req.body;
  if (!owner) {
    return res.status(400).json({ message: "Owner required" });
  }

  let wallet = await Wallet.findOne({ owner });
  if (wallet) {
    return res.json({ message: "Wallet exists", wallet });
  }

  wallet = await Wallet.create({ owner });
  res.json({ message: "Wallet created", wallet });
});

/* =======================
   B2C REQUEST OTP
   ======================= */
app.post("/api/b2c/request-otp", async (req, res) => {
  try {
    const { owner, amount, pin } = req.body;

    if (!owner || !amount || !pin) {
      return res.status(400).json({ message: "Missing fields" });
    }

    if (withdrawalsFrozen) {
      return res.status(403).json({ message: "Withdrawals are frozen" });
    }

    const wallet = await Wallet.findOne({ owner });
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 60 * 1000;

    otpStore.set(owner, { otp, amount, expiresAt });

    if (NODE_ENV !== "production") {
      console.log("🔐 OTP GENERATED", { owner, otp, expiresAt });
    }

    res.json({ message: "OTP sent" });
  } catch (err) {
    console.error("❌ OTP request error", err);
    res.status(500).json({ message: "OTP error" });
  }
});

/* =======================
   B2C CONFIRM OTP
   ======================= */
app.post("/api/b2c/confirm", async (req, res) => {
  try {
    const { owner, otp } = req.body;

    if (!owner || !otp) {
      return res.status(400).json({ message: "Owner and OTP required" });
    }

    const record = otpStore.get(owner);

    if (NODE_ENV !== "production") {
      console.log("🔎 OTP CONFIRM ATTEMPT", {
        owner,
        providedOtp: otp,
        stored: record
      });
    }

    if (!record) {
      return res.status(400).json({ message: "No OTP request found" });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(owner);
      return res.status(400).json({ message: "OTP expired" });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const wallet = await Wallet.findOne({ owner });
    wallet.balance -= record.amount;
    await wallet.save();

    await Transaction.create({
      type: "B2C",
      owner,
      amount: record.amount,
      reference: "B2C-" + Date.now()
    });

    otpStore.delete(owner);

    res.json({
      message: "Withdrawal successful",
      amount: record.amount
    });
  } catch (err) {
    console.error("❌ OTP confirm error", err);
    res.status(500).json({ message: "Confirmation error" });
  }
});

/* =======================
   C2B CONFIRMATION
   ======================= */
app.post("/api/c2b/confirmation", async (req, res) => {
  console.log("📩 C2B confirmation", req.body);
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

/* =======================
   START SERVER
   ======================= */
app.listen(PORT, () => {
  console.log(`🚀 Afri Smart Pay running on port ${PORT}`);
});
