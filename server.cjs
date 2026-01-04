const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

/* ============== MIDDLEWARE ============== */
app.use(cors());
app.use(express.json());

/* ============== DATABASE ============== */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB error:", err.message);
    process.exit(1);
  });

/* ============== MODELS ============== */
const WalletSchema = new mongoose.Schema(
  {
    owner: { type: String, unique: true },
    balance: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const TransactionSchema = new mongoose.Schema(
  {
    phone: String,
    amount: Number,
    transId: String,
    type: { type: String, default: "C2B" },
    raw: Object
  },
  { timestamps: true }
);

const Wallet = mongoose.model("Wallet", WalletSchema);
const Transaction = mongoose.model("Transaction", TransactionSchema);

/* ============== HELPERS ============== */
async function getOrCreateWallet(phone) {
  let wallet = await Wallet.findOne({ owner: phone });
  if (!wallet) {
    wallet = await Wallet.create({ owner: phone, balance: 0 });
  }
  return wallet;
}

/* ============== HEALTH ============== */
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

/* ============== C2B VALIDATION ============== */
app.post("/api/c2b/validation", (req, res) => {
  console.log("📥 C2B VALIDATION");
  console.log(JSON.stringify(req.body, null, 2));

  res.json({
    ResultCode: 0,
    ResultDesc: "Accepted"
  });
});

/* ============== C2B CONFIRMATION ============== */
app.post("/api/c2b/confirmation", async (req, res) => {
  try {
    console.log("💰 C2B CONFIRMATION");
    console.log(JSON.stringify(req.body, null, 2));

    const { TransID, TransAmount, MSISDN } = req.body;

    if (!TransID || !TransAmount || !MSISDN) {
      return res.json({ ResultCode: 0, ResultDesc: "Ignored" });
    }

    const exists = await Transaction.findOne({ transId: TransID });
    if (exists) {
      return res.json({ ResultCode: 0, ResultDesc: "Duplicate ignored" });
    }

    const wallet = await getOrCreateWallet(MSISDN);
    wallet.balance += Number(TransAmount);
    await wallet.save();

    await Transaction.create({
      phone: MSISDN,
      amount: Number(TransAmount),
      transId: TransID,
      raw: req.body
    });

    res.json({
      ResultCode: 0,
      ResultDesc: "Success"
    });
  } catch (err) {
    console.error("🔥 CONFIRMATION ERROR:", err);
    res.json({
      ResultCode: 0,
      ResultDesc: "Handled"
    });
  }
});

/* ============== QUERIES ============== */
app.get("/api/wallet/balance/:phone", async (req, res) => {
  const wallet = await Wallet.findOne({ owner: req.params.phone });
  res.json({ balance: wallet ? wallet.balance : 0 });
});

app.get("/api/transactions/:phone", async (req, res) => {
  const tx = await Transaction.find({ phone: req.params.phone }).sort({ createdAt: -1 });
  res.json(tx);
});

/* ============== START ============== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Smart Pay running on port ${PORT}`);
});
