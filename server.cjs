const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(express.json());

// =======================
// DATABASE CONNECTION
// =======================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err.message));

// =======================
// SCHEMAS & MODELS
// =======================
const walletSchema = new mongoose.Schema({
  phone: { type: String, unique: true },
  balance: { type: Number, default: 0 }
}, { timestamps: true });

const transactionSchema = new mongoose.Schema({
  transId: { type: String, unique: true },
  phone: String,
  amount: Number,
  status: String
}, { timestamps: true });

const Wallet = mongoose.model("Wallet", walletSchema);
const Transaction = mongoose.model("Transaction", transactionSchema);

// =======================
// HEALTH CHECK
// =======================
app.get("/", (req, res) => {
  res.send("Afri Smart Pay API 💳 — LIVE");
});

// =======================
// C2B VALIDATION
// =======================
app.post("/api/c2b/validation", (req, res) => {
  console.log("🟢 C2B VALIDATION RECEIVED");
  console.log(JSON.stringify(req.body, null, 2));

  res.json({
    ResultCode: 0,
    ResultDesc: "Accepted"
  });
});

// =======================
// C2B CONFIRMATION (AUTO CREDIT)
// =======================
app.post("/api/c2b/confirmation", async (req, res) => {
  try {
    console.log("🔥 C2B CONFIRMATION RECEIVED");
    console.log(JSON.stringify(req.body, null, 2));

    const { TransID, TransAmount, MSISDN } = req.body;

    if (!TransID || !TransAmount || !MSISDN) {
      console.log("⚠️ Missing transaction fields");
      return res.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const phone = MSISDN.startsWith("254")
      ? MSISDN
      : "254" + MSISDN.slice(-9);

    const amount = Number(TransAmount);

    const existingTx = await Transaction.findOne({ transId: TransID });
    if (existingTx) {
      console.log("⚠️ Duplicate transaction ignored:", TransID);
      return res.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    let wallet = await Wallet.findOne({ phone });
    if (!wallet) {
      wallet = await Wallet.create({ phone, balance: 0 });
      console.log("🆕 Wallet created for", phone);
    }

    wallet.balance += amount;
    await wallet.save();

    await Transaction.create({
      transId: TransID,
      phone,
      amount,
      status: "SUCCESS"
    });

    console.log(`✅ Wallet credited: ${phone} +${amount}`);

    res.json({ ResultCode: 0, ResultDesc: "Accepted" });

  } catch (err) {
    console.error("❌ C2B ERROR:", err.message);
    res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
});

// =======================
// START SERVER
// =======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Afri Smart Pay running on port ${PORT}`);
});
