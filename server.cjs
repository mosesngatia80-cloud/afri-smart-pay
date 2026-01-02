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
  phone: String,
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
app.get("/api/wallet/:phone", async (req, res) => {
  const wallet = await Wallet.findOne({ owner: req.params.phone });
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

  // Always accept
  return res.json({
    ResultCode: 0,
    ResultDesc: "Accepted"
  });
});

// =====================
// C2B CONFIRMATION
// =====================
app.post("/api/c2b/confirmation", async (req, res) => {
  console.log("✅ C2B CONFIRMATION:", req.body);

  const {
    TransID,
    TransAmount,
    MSISDN
  } = req.body;

  try {
    // 🔒 Prevent double credit
    const exists = await Transaction.findOne({ transId: TransID });
    if (exists) {
      return res.json({
        ResultCode: 0,
        ResultDesc: "Already processed"
      });
    }

    // 💳 Get or create wallet
    let wallet = await Wallet.findOne({ owner: MSISDN });
    if (!wallet) {
      wallet = await Wallet.create({ owner: MSISDN });
    }

    // ➕ Credit wallet
    wallet.balance += Number(TransAmount);
    await wallet.save();

    // 🧾 Save transaction
    await Transaction.create({
      transId: TransID,
      phone: MSISDN,
      amount: TransAmount
    });

    return res.json({
      ResultCode: 0,
      ResultDesc: "Success"
    });

  } catch (err) {
    console.error("❌ CONFIRMATION ERROR:", err.message);

    // IMPORTANT: still return success to avoid retries
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
