require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");

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
  balance: { type: Number, default: 0 }
});

const TransactionSchema = new mongoose.Schema({
  transId: { type: String, unique: true },
  owner: String,
  amount: Number,
  type: { type: String, default: "C2B" },
  createdAt: { type: Date, default: Date.now }
});

const Wallet = mongoose.model("Wallet", WalletSchema);
const Transaction = mongoose.model("Transaction", TransactionSchema);

// =====================
// ROUTES
// =====================

// 🔎 Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "Smart Pay LIVE 🚀" });
});

// 💳 Get wallet balance
app.get("/api/wallet/:owner", async (req, res) => {
  const wallet = await Wallet.findOne({ owner: req.params.owner });
  if (!wallet) {
    return res.status(404).json({ message: "Wallet not found" });
  }
  res.json(wallet);
});

// =====================
// C2B VALIDATION
// =====================
app.post("/api/c2b/validation", (req, res) => {
  console.log("✅ C2B VALIDATION:", req.body);
  return res.json({
    ResultCode: 0,
    ResultDesc: "Accepted"
  });
});

// =====================
// C2B CONFIRMATION (UX CORRECT)
// =====================
app.post("/api/c2b/confirmation", async (req, res) => {
  console.log("✅ C2B CONFIRMATION:", req.body);

  const {
    TransID,
    TransAmount,
    BillRefNumber
  } = req.body;

  try {
    if (!TransID || !TransAmount || !BillRefNumber) {
      console.warn("⚠️ Missing C2B fields");
      return res.json({ ResultCode: 0, ResultDesc: "Ignored" });
    }

    // 🔒 Idempotency: prevent double credit
    const exists = await Transaction.findOne({ transId: TransID });
    if (exists) {
      console.log("🔁 Duplicate transaction:", TransID);
      return res.json({
        ResultCode: 0,
        ResultDesc: "Already processed"
      });
    }

    // 💳 Find or create wallet using BillRefNumber
    let wallet = await Wallet.findOne({ owner: BillRefNumber });
    if (!wallet) {
      wallet = await Wallet.create({
        owner: BillRefNumber,
        balance: 0
      });
    }

    // ➕ Credit wallet
    wallet.balance += Number(TransAmount);
    await wallet.save();

    // 🧾 Save transaction
    await Transaction.create({
      transId: TransID,
      owner: BillRefNumber,
      amount: Number(TransAmount),
      type: "C2B"
    });

    console.log(`💰 Wallet ${BillRefNumber} credited with ${TransAmount}`);

    return res.json({
      ResultCode: 0,
      ResultDesc: "Success"
    });

  } catch (err) {
    console.error("❌ CONFIRMATION ERROR:", err.message);
    return res.json({
      ResultCode: 0,
      ResultDesc: "Accepted"
    });
  }
});

// =====================
// SERVER
// =====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Smart Pay running on port ${PORT}`);
});

// =====================
// B2C WITHDRAWAL (LOGIC ONLY)
// =====================
app.post("/api/b2c/withdraw", async (req, res) => {
  try {
    const { owner, phone, amount } = req.body;

    if (!owner || !phone || !amount) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const wallet = await Wallet.findOne({ owner });
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    if (wallet.balance < Number(amount)) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // Debit wallet
    wallet.balance -= Number(amount);
    await wallet.save();

    // Record transaction
    await Transaction.create({
      transId: `B2C_${Date.now()}`,
      owner,
      amount: Number(amount),
      type: "B2C"
    });

    console.log(`💸 B2C withdrawal queued for ${owner}: ${amount}`);

    return res.json({
      message: "Withdrawal queued",
      amount
    });
  } catch (err) {
    console.error("❌ B2C ERROR:", err.message);
    return res.status(500).json({ message: "B2C failed" });
  }
});
