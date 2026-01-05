const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const crypto = require("crypto");
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
    from: String,
    to: String,
    amount: Number,
    fee: Number,
    reference: String,
    type: String,
    raw: Object
  },
  { timestamps: true }
);

const Wallet = mongoose.model("Wallet", WalletSchema);
const Transaction = mongoose.model("Transaction", TransactionSchema);

/* ============== HELPERS ============== */
async function getOrCreateWallet(owner) {
  let wallet = await Wallet.findOne({ owner });
  if (!wallet) {
    wallet = await Wallet.create({ owner, balance: 0 });
  }
  return wallet;
}

/* ============== HEALTH ============== */
app.get("/api/health", (req, res) => {
  res.json({ status: "Smart Pay running" });
});

/* ============== WALLET → ORDER PAYMENT ============== */
app.post("/api/payments/wallet", async (req, res) => {
  try {
    const { payer, business, amount } = req.body;

    if (!payer || !business || !amount) {
      return res.status(400).json({
        success: false,
        message: "payer, business and amount are required"
      });
    }

    /* ===== Fee rules ===== */
    let fee = 0;
    if (amount <= 100) fee = 0;
    else if (amount <= 1000) fee = amount * 0.005;
    else fee = amount * 0.01;

    fee = Math.min(Math.round(fee), 20);
    const totalDebit = amount + fee;

    /* ===== Wallets ===== */
    const payerWallet = await getOrCreateWallet(payer);
    const bizWallet = await getOrCreateWallet(business);
    const platformWallet = await getOrCreateWallet("PLATFORM_WALLET");

    if (payerWallet.balance < totalDebit) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance"
      });
    }

    /* ===== Transfer ===== */
    const reference =
      "TXN_" + crypto.randomBytes(4).toString("hex").toUpperCase();

    payerWallet.balance -= totalDebit;
    bizWallet.balance += amount;
    platformWallet.balance += fee;

    await payerWallet.save();
    await bizWallet.save();
    await platformWallet.save();

    await Transaction.create({
      from: payer,
      to: business,
      amount,
      fee,
      reference,
      type: "WALLET_PAYMENT",
      raw: req.body
    });

    return res.json({
      success: true,
      message: "Payment successful",
      reference,
      amount,
      fee,
      balance: payerWallet.balance
    });

  } catch (err) {
    console.error("❌ Wallet payment error:", err);
    return res.status(500).json({
      success: false,
      message: "Payment failed"
    });
  }
});

/* ============== C2B VALIDATION ============== */
app.post("/api/c2b/validation", (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

/* ============== C2B CONFIRMATION ============== */
app.post("/api/c2b/confirmation", async (req, res) => {
  try {
    const { TransID, TransAmount, MSISDN } = req.body;
    if (!TransID || !TransAmount || !MSISDN) {
      return res.json({ ResultCode: 0, ResultDesc: "Ignored" });
    }

    const exists = await Transaction.findOne({ reference: TransID });
    if (exists) {
      return res.json({ ResultCode: 0, ResultDesc: "Duplicate ignored" });
    }

    const wallet = await getOrCreateWallet(MSISDN);
    wallet.balance += Number(TransAmount);
    await wallet.save();

    await Transaction.create({
      from: "MPESA",
      to: MSISDN,
      amount: Number(TransAmount),
      reference: TransID,
      type: "C2B",
      raw: req.body
    });

    res.json({ ResultCode: 0, ResultDesc: "Success" });
  } catch (err) {
    res.json({ ResultCode: 0, ResultDesc: "Handled" });
  }
});

/* ============== QUERIES ============== */
app.get("/api/wallet/balance/:phone", async (req, res) => {
  const wallet = await Wallet.findOne({ owner: req.params.phone });
  res.json({ balance: wallet ? wallet.balance : 0 });
});

/* ============== START ============== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Smart Pay running on port ${PORT}`);
});
