const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(express.json());

// =======================
// GLOBAL REQUEST LOGGER
app.use((req, res, next) => {
  console.log("🔥 INCOMING REQUEST:", req.method, req.path);
  next();
});

// =======================
// DATABASE
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err.message));

// =======================
// MODELS
const walletSchema = new mongoose.Schema({
  phone: { type: String, unique: true },
  balance: { type: Number, default: 0 }
});

const transactionSchema = new mongoose.Schema({
  transId: { type: String, unique: true },
  phone: String,
  amount: Number,
  type: String, // C2B_CREDIT | RECONCILIATION
  createdAt: { type: Date, default: Date.now }
});

const Wallet = mongoose.model("Wallet", walletSchema);
const Transaction = mongoose.model("Transaction", transactionSchema);

// =======================
// C2B VALIDATION
app.post("/api/c2b/validation", (req, res) => {
  console.log("🔥🔥🔥 VALIDATION HIT 🔥🔥🔥");
  console.log(req.body);
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

// =======================
// C2B CONFIRMATION (AUTO CREDIT)
app.post("/api/c2b/confirmation", async (req, res) => {
  console.log("🔥🔥🔥 CONFIRMATION HIT 🔥🔥🔥");
  console.log(req.body);

  try {
    const { TransID, TransAmount, MSISDN } = req.body;
    if (!TransID || !TransAmount || !MSISDN) {
      return res.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const exists = await Transaction.findOne({ transId: TransID });
    if (exists) {
      return res.json({ ResultCode: 0, ResultDesc: "Duplicate" });
    }

    let wallet = await Wallet.findOne({ phone: MSISDN });
    if (!wallet) {
      wallet = await Wallet.create({ phone: MSISDN, balance: 0 });
    }

    wallet.balance += Number(TransAmount);
    await wallet.save();

    await Transaction.create({
      transId: TransID,
      phone: MSISDN,
      amount: Number(TransAmount),
      type: "C2B_CREDIT"
    });

    console.log("✅ Wallet credited:", wallet.balance);
    res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (err) {
    console.error(err);
    res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
});

// =======================
// CHECK WALLET BALANCE
app.get("/api/wallet/:phone", async (req, res) => {
  const wallet = await Wallet.findOne({ phone: req.params.phone });
  if (!wallet) return res.status(404).json({ message: "Wallet not found" });
  res.json({ phone: wallet.phone, balance: wallet.balance });
});

// =======================
// WALLET TRANSACTION HISTORY (READ-ONLY)
app.get("/api/wallet/:phone/transactions", async (req, res) => {
  const phone = req.params.phone;
  const transactions = await Transaction.find({ phone }).sort({ createdAt: -1 });
  res.json(transactions);
});

// =======================
// ADMIN RECONCILIATION (SECURE)
app.post("/api/admin/reconcile", async (req, res) => {
  const adminKey = req.headers["x-admin-key"];
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { TransID, TransAmount, MSISDN } = req.body;
  if (!TransID || !TransAmount || !MSISDN) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const exists = await Transaction.findOne({ transId: TransID });
  if (exists) {
    return res.json({ message: "Already reconciled" });
  }

  let wallet = await Wallet.findOne({ phone: MSISDN });
  if (!wallet) wallet = await Wallet.create({ phone: MSISDN, balance: 0 });

  wallet.balance += Number(TransAmount);
  await wallet.save();

  await Transaction.create({
    transId: TransID,
    phone: MSISDN,
    amount: Number(TransAmount),
    type: "RECONCILIATION"
  });

  res.json({ message: "Reconciled successfully", balance: wallet.balance });
});

// =======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 SERVER RUNNING ON", PORT);
});
