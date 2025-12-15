const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
app.use(express.json());

/* ================= DATABASE ================= */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err.message));

/* ================= MODELS ================= */
const walletSchema = new mongoose.Schema({
  phone: { type: String, unique: true },
  balance: { type: Number, default: 0 }
});

const transactionSchema = new mongoose.Schema({
  phone: String,
  amount: Number,
  type: String, // C2B_TOPUP | SEND
  reference: String,
  createdAt: { type: Date, default: Date.now }
});

const Wallet = mongoose.model("Wallet", walletSchema);
const Transaction = mongoose.model("Transaction", transactionSchema);

/* ================= WALLET ROUTES ================= */

// Create wallet (optional, auto-created on topup/send)
app.post("/api/create-wallet", async (req, res) => {
  const { phone } = req.body;

  let wallet = await Wallet.findOne({ phone });
  if (!wallet) {
    wallet = await Wallet.create({ phone, balance: 0 });
  }

  res.json({ success: true, wallet });
});

// Check balance
app.post("/api/check-balance", async (req, res) => {
  const { phone } = req.body;

  let wallet = await Wallet.findOne({ phone });
  if (!wallet) {
    wallet = await Wallet.create({ phone, balance: 0 });
  }

  res.json({
    success: true,
    phone,
    balance: wallet.balance
  });
});

// Send money (wallet → wallet)
app.post("/api/send-money", async (req, res) => {
  const { from, to, amount } = req.body;
  const amt = Number(amount);

  if (!from || !to || amt <= 0) {
    return res.status(400).json({ success: false, error: "Invalid request" });
  }

  let sender = await Wallet.findOne({ phone: from });
  let receiver = await Wallet.findOne({ phone: to });

  if (!sender) sender = await Wallet.create({ phone: from, balance: 0 });
  if (!receiver) receiver = await Wallet.create({ phone: to, balance: 0 });

  if (sender.balance < amt) {
    return res.json({
      success: false,
      error: "Insufficient balance",
      balance: sender.balance
    });
  }

  sender.balance -= amt;
  receiver.balance += amt;

  await sender.save();
  await receiver.save();

  await Transaction.create({
    phone: from,
    amount: amt,
    type: "SEND",
    reference: `SEND-${Date.now()}`
  });

  res.json({
    success: true,
    message: "Transfer successful",
    from,
    to,
    balance: sender.balance
  });
});

/* ================= M-PESA C2B ================= */

// Validation URL
app.post("/api/mpesa/validation", (req, res) => {
  console.log("📥 M-PESA VALIDATION:", req.body);

  return res.json({
    ResultCode: 0,
    ResultDesc: "Accepted"
  });
});

// Confirmation URL
app.post("/api/mpesa/confirmation", async (req, res) => {
  console.log("💰 M-PESA CONFIRMATION:", req.body);

  try {
    const { TransAmount, MSISDN, TransID } = req.body;

    const phone = MSISDN;
    const amount = Number(TransAmount);

    let wallet = await Wallet.findOne({ phone });
    if (!wallet) {
      wallet = await Wallet.create({ phone, balance: 0 });
    }

    wallet.balance += amount;
    await wallet.save();

    await Transaction.create({
      phone,
      amount,
      type: "C2B_TOPUP",
      reference: TransID
    });

    console.log(`✅ Wallet credited: ${phone} +${amount}`);

    return res.json({
      ResultCode: 0,
      ResultDesc: "Success"
    });

  } catch (err) {
    console.error("❌ C2B ERROR:", err.message);
    return res.json({
      ResultCode: 1,
      ResultDesc: "Failed"
    });
  }
});

/* ================= SERVER ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Afri Smart Pay API running on port ${PORT}`);
});
