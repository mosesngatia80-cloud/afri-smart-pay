const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

/* ================= MIDDLEWARE ================= */
app.use(cors());
app.use(express.json());

/* ================= DATABASE ================= */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err.message));

/* ================= MODELS ================= */
const WalletSchema = new mongoose.Schema({
  owner: { type: String, unique: true },
  balance: { type: Number, default: 0 }
});

const TransactionSchema = new mongoose.Schema({
  from: String,
  to: String,
  amount: Number,
  reference: String,
  createdAt: { type: Date, default: Date.now }
});

const Wallet = mongoose.model("Wallet", WalletSchema);
const Transaction = mongoose.model("Transaction", TransactionSchema);

/* ================= CORE LOGIC ================= */
async function sendMoney(req, res) {
  try {
    const { from, to, amount, reference } = req.body;

    if (!from || !to || !amount) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const sender = await Wallet.findOne({ owner: from });
    const receiver = await Wallet.findOne({ owner: to });

    if (!sender) return res.status(404).json({ message: "Sender wallet not found" });
    if (!receiver) return res.status(404).json({ message: "Receiver wallet not found" });
    if (sender.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    sender.balance -= amount;
    receiver.balance += amount;

    await sender.save();
    await receiver.save();

    const tx = await Transaction.create({ from, to, amount, reference });

    res.json({ message: "Transfer successful", transactionId: tx._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Transfer failed" });
  }
}

/* ================= ROUTES ================= */
app.get("/api/health", (req, res) => {
  res.json({ status: "Smart Pay running" });
});

app.post("/api/send-money", sendMoney);
app.post("/api/wallet/send", sendMoney);
app.post("/api/transfer", sendMoney);

/* ================= START ================= */
app.listen(PORT, () => {
  console.log(`🚀 Smart Pay running on port ${PORT}`);
});
