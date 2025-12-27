const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(express.json());

// 🔥 GLOBAL REQUEST LOGGER
app.use((req, res, next) => {
  console.log("🔥 INCOMING REQUEST:", req.method, req.path);
  next();
});

// =======================
// DATABASE
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err.message));

// =======================
// MODELS
const walletSchema = new mongoose.Schema({
  phone: { type: String, unique: true },
  balance: { type: Number, default: 0 }
});

const transactionSchema = new mongoose.Schema({
  transId: { type: String, unique: true }
});

const Wallet = mongoose.model("Wallet", walletSchema);
const Transaction = mongoose.model("Transaction", transactionSchema);

// =======================
// C2B VALIDATION
app.post("/api/c2b/validation", (req, res) => {
  console.log("🔥🔥🔥 VALIDATION HIT 🔥🔥🔥");
  console.log(req.body);

  res.json({
    ResultCode: 0,
    ResultDesc: "Accepted"
  });
});

// =======================
// C2B CONFIRMATION (AUTO CREDIT)
app.post("/api/c2b/confirmation", async (req, res) => {
  console.log("🔥🔥🔥 CONFIRMATION HIT 🔥🔥🔥");
  console.log(req.body);

  try {
    const {
      TransID,
      TransAmount,
      MSISDN
    } = req.body;

    if (!TransID || !TransAmount || !MSISDN) {
      console.log("❌ Missing fields");
      return res.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    // 🛑 Prevent duplicate credit
    const exists = await Transaction.findOne({ transId: TransID });
    if (exists) {
      console.log("⚠️ Duplicate transaction:", TransID);
      return res.json({ ResultCode: 0, ResultDesc: "Duplicate" });
    }

    // ✅ Find or create wallet
    let wallet = await Wallet.findOne({ phone: MSISDN });
    if (!wallet) {
      wallet = await Wallet.create({
        phone: MSISDN,
        balance: 0
      });
      console.log("🆕 Wallet created for", MSISDN);
    }

    // 💰 Credit wallet
    wallet.balance += Number(TransAmount);
    await wallet.save();

    // 📌 Save transaction
    await Transaction.create({ transId: TransID });

    console.log("✅ Wallet credited:", {
      phone: MSISDN,
      amount: TransAmount,
      newBalance: wallet.balance
    });

    res.json({
      ResultCode: 0,
      ResultDesc: "Accepted"
    });

  } catch (err) {
    console.error("❌ Confirmation error:", err.message);
    res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
});

// =======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 SERVER RUNNING ON", PORT);
});
