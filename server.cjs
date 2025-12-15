const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(express.json());

/* ===============================
   DATABASE CONNECTION (FIXED)
================================ */
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
  })
  .catch(err => {
    console.error("❌ MongoDB connection error:", err.message);
  });

/* ===============================
   MODELS
================================ */
const walletSchema = new mongoose.Schema({
  phone: { type: String, unique: true },
  balance: { type: Number, default: 0 },
  currency: { type: String, default: "KES" },
  status: { type: String, default: "active" }
}, { timestamps: true });

const Wallet = mongoose.model("Wallet", walletSchema);

const transactionSchema = new mongoose.Schema({
  transId: { type: String, unique: true },
  phone: String,
  amount: Number,
  type: String,
  status: String
}, { timestamps: true });

const Transaction = mongoose.model("Transaction", transactionSchema);

/* ===============================
   HEALTH CHECK
================================ */
app.get("/", (req, res) => {
  res.send("🚀 Afri Smart Pay API running");
});

/* ===============================
   CHECK BALANCE
================================ */
app.get("/api/check-balance", async (req, res) => {
  const { phone } = req.query;
  const wallet = await Wallet.findOne({ phone });
  res.json({
    phone,
    balance: wallet ? wallet.balance : 0
  });
});

/* ===============================
   C2B VALIDATION
================================ */
app.post("/api/c2b/validation", (req, res) => {
  console.log("🔎 C2B Validation:", req.body);
  return res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

/* ===============================
   C2B CONFIRMATION (WALLET CREDIT)
================================ */
app.post("/api/c2b/confirmation", async (req, res) => {
  try {
    const { TransID, MSISDN, TransAmount } = req.body;

    const exists = await Transaction.findOne({ transId: TransID });
    if (exists) {
      return res.json({ ResultCode: 0, ResultDesc: "Already processed" });
    }

    await Transaction.create({
      transId: TransID,
      phone: MSISDN,
      amount: Number(TransAmount),
      type: "C2B_TOPUP",
      status: "completed"
    });

    await Wallet.findOneAndUpdate(
      { phone: MSISDN },
      { $inc: { balance: Number(TransAmount) } },
      { upsert: true }
    );

    console.log(`💰 Wallet credited: ${MSISDN} +${TransAmount}`);

    return res.json({ ResultCode: 0, ResultDesc: "Accepted" });

  } catch (err) {
    console.error("❌ Confirmation error:", err.message);
    return res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
});

/* ===============================
   SEND MONEY (WALLET → WALLET)
================================ */
app.post("/api/send-money", async (req, res) => {
  const { from, to, amount } = req.body;

  const sender = await Wallet.findOne({ phone: from });
  if (!sender || sender.balance < amount) {
    return res.status(400).json({ error: "Insufficient balance" });
  }

  await Wallet.updateOne({ phone: from }, { $inc: { balance: -amount } });
  await Wallet.updateOne(
    { phone: to },
    { $inc: { balance: amount } },
    { upsert: true }
  );

  await Transaction.create([
    { transId: Date.now() + from, phone: from, amount, type: "SEND", status: "completed" },
    { transId: Date.now() + to, phone: to, amount, type: "RECEIVE", status: "completed" }
  ]);

  res.json({ success: true });
});

/* ===============================
   START SERVER
================================ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🔥 Afri Smart Pay API running on port ${PORT}`);
});
