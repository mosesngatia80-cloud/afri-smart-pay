const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

/* ===== DEPLOY MARKER (DO NOT REMOVE) ===== */
console.log("🔥 DEPLOY CHECK: Smart Pay C2B routes active");

/* ================= MIDDLEWARE ================= */
app.use(cors());
app.use(express.json());

/* ================= MONGODB ================= */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err.message));

/* ================= MODELS ================= */
const WalletSchema = new mongoose.Schema({
  owner: { type: String, unique: true },
  balance: { type: Number, default: 0 }
});

const TransactionSchema = new mongoose.Schema({
  type: String,
  phone: String,
  amount: Number,
  reference: String,
  raw: Object,
  createdAt: { type: Date, default: Date.now }
});

const Wallet = mongoose.model("Wallet", WalletSchema);
const Transaction = mongoose.model("Transaction", TransactionSchema);

/* ================= HEALTH ================= */
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", service: "Smart Pay LIVE" });
});

/* ================= WALLET ================= */
app.post("/api/wallet/create", async (req, res) => {
  try {
    const { owner } = req.body;
    if (!owner) return res.status(400).json({ message: "Owner required" });

    let wallet = await Wallet.findOne({ owner });
    if (!wallet) {
      wallet = await Wallet.create({ owner });
    }

    res.json({ message: "Wallet ready", wallet });
  } catch (err) {
    res.status(500).json({ message: "Wallet error" });
  }
});

app.get("/api/wallet/balance/:phone", async (req, res) => {
  const wallet = await Wallet.findOne({ owner: req.params.phone });
  if (!wallet) return res.status(404).json({ message: "Wallet not found" });
  res.json({ balance: wallet.balance });
});

/* ================= C2B VALIDATION ================= */
app.post("/api/c2b/validation", (req, res) => {
  console.log("🔔 C2B VALIDATION HIT");
  console.log(JSON.stringify(req.body, null, 2));

  return res.json({
    ResultCode: 0,
    ResultDesc: "Accepted"
  });
});

/* ================= C2B CONFIRMATION ================= */
app.post("/api/c2b/confirmation", async (req, res) => {
  console.log("💰 C2B CONFIRMATION HIT");
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const phone =
      req.body.MSISDN ||
      req.body.PhoneNumber ||
      req.body.senderPhoneNumber;

    const amount = Number(req.body.TransAmount || req.body.amount || 0);
    const reference =
      req.body.TransID ||
      req.body.transactionId ||
      "C2B";

    if (!phone || amount <= 0) {
      return res.json({ ResultCode: 0, ResultDesc: "Ignored" });
    }

    // Ensure wallet exists
    let wallet = await Wallet.findOne({ owner: phone });
    if (!wallet) {
      wallet = await Wallet.create({ owner: phone });
    }

    // Credit wallet
    wallet.balance += amount;
    await wallet.save();

    // Save transaction
    await Transaction.create({
      type: "C2B",
      phone,
      amount,
      reference,
      raw: req.body
    });

    console.log(`✅ Wallet credited: ${phone} +${amount}`);

    return res.json({
      ResultCode: 0,
      ResultDesc: "Success"
    });
  } catch (err) {
    console.error("❌ Confirmation error:", err.message);
    return res.json({ ResultCode: 0, ResultDesc: "Handled" });
  }
});

/* ================= START ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Smart Pay running on port ${PORT}`);
});
