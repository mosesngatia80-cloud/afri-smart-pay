const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
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
  balance: { type: Number, default: 0 },
  pinHash: { type: String } // hashed PIN
});

const transactionSchema = new mongoose.Schema({
  phone: String,
  amount: Number,
  type: String, // SEND | C2B_TOPUP
  reference: String,
  createdAt: { type: Date, default: Date.now }
});

const Wallet = mongoose.model("Wallet", walletSchema);
const Transaction = mongoose.model("Transaction", transactionSchema);

/* ================= HELPERS ================= */
async function getOrCreateWallet(phone) {
  let wallet = await Wallet.findOne({ phone });
  if (!wallet) {
    wallet = await Wallet.create({ phone, balance: 0 });
  }
  return wallet;
}

/* ================= WALLET ROUTES ================= */

// Check balance
app.post("/api/check-balance", async (req, res) => {
  const { phone } = req.body;
  const wallet = await getOrCreateWallet(phone);

  res.json({
    success: true,
    phone,
    balance: wallet.balance
  });
});

/* ================= PIN SETUP ================= */

// Set or change PIN
app.post("/api/set-pin", async (req, res) => {
  const { phone, pin } = req.body;

  if (!pin || pin.length < 4) {
    return res.json({ success: false, error: "PIN must be at least 4 digits" });
  }

  const wallet = await getOrCreateWallet(phone);
  wallet.pinHash = await bcrypt.hash(pin, 10);
  await wallet.save();

  res.json({ success: true, message: "PIN set successfully" });
});

/* ================= SEND MONEY (PIN PROTECTED) ================= */

app.post("/api/send-money", async (req, res) => {
  const { from, to, amount, pin } = req.body;
  const amt = Number(amount);

  if (!from || !to || !pin || amt <= 0) {
    return res.json({ success: false, error: "Invalid request" });
  }

  const sender = await getOrCreateWallet(from);
  const receiver = await getOrCreateWallet(to);

  if (!sender.pinHash) {
    return res.json({
      success: false,
      error: "PIN not set. Please set PIN first."
    });
  }

  const pinOk = await bcrypt.compare(pin, sender.pinHash);
  if (!pinOk) {
    return res.json({ success: false, error: "Invalid PIN" });
  }

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

// Validation
app.post("/api/mpesa/validation", (req, res) => {
  console.log("📥 M-PESA VALIDATION:", req.body);
  return res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

// Confirmation
app.post("/api/mpesa/confirmation", async (req, res) => {
  console.log("💰 M-PESA CONFIRMATION:", req.body);

  try {
    const { TransAmount, MSISDN, TransID } = req.body;
    const phone = MSISDN;
    const amount = Number(TransAmount);

    const wallet = await getOrCreateWallet(phone);
    wallet.balance += amount;
    await wallet.save();

    await Transaction.create({
      phone,
      amount,
      type: "C2B_TOPUP",
      reference: TransID
    });

    return res.json({ ResultCode: 0, ResultDesc: "Success" });
  } catch (err) {
    console.error("❌ C2B ERROR:", err.message);
    return res.json({ ResultCode: 1, ResultDesc: "Failed" });
  }
});

/* ================= SERVER ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Afri Smart Pay API running on port ${PORT}`);
});
