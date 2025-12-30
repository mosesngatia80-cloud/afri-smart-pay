const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

/* ================= CONFIG ================= */
const PORT = process.env.PORT || 3000;

/* ================= MIDDLEWARE ================= */
app.use(cors());
app.use(express.json());

/* ================= DATABASE ================= */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err.message));

/* ================= MODELS ================= */
const WalletSchema = new mongoose.Schema({
  owner: { type: String, unique: true },
  balance: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
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

/* ================= WALLET ROUTES ================= */

/* Create wallet (idempotent) */
app.post("/api/wallet/create", async (req, res) => {
  try {
    const { owner } = req.body;
    if (!owner) {
      return res.status(400).json({ message: "Owner is required" });
    }

    let wallet = await Wallet.findOne({ owner });

    if (wallet) {
      return res.json({
        message: "Wallet already exists",
        wallet
      });
    }

    wallet = await Wallet.create({ owner });

    res.json({
      message: "Wallet created",
      wallet
    });

  } catch (err) {
    console.error("❌ Wallet create error:", err.message);
    res.status(500).json({ message: "Wallet creation failed" });
  }
});

/* Get wallet by owner */
app.get("/api/wallet/:owner", async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ owner: req.params.owner });
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    res.json(wallet);
  } catch (err) {
    res.status(500).json({ message: "Error fetching wallet" });
  }
});

/* ================= TRANSFER LOGIC ================= */
async function sendMoney(req, res) {
  try {
    const { from, to, amount, reference } = req.body;

    if (!from || !to || !amount) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const sender = await Wallet.findOne({ owner: from });
    const receiver = await Wallet.findOne({ owner: to });

    if (!sender) {
      return res.status(404).json({ message: "Sender wallet not found" });
    }

    if (!receiver) {
      return res.status(404).json({ message: "Receiver wallet not found" });
    }

    if (sender.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    sender.balance -= amount;
    receiver.balance += amount;

    await sender.save();
    await receiver.save();

    const tx = await Transaction.create({
      from,
      to,
      amount,
      reference
    });

    res.json({
      message: "Transfer successful",
      transactionId: tx._id
    });

  } catch (err) {
    console.error("❌ Transfer error:", err.message);
    res.status(500).json({ message: "Transfer failed" });
  }
}

/* ================= TRANSFER ROUTES ================= */
app.post("/api/wallet/send", sendMoney);
app.post("/api/send-money", sendMoney);
app.post("/api/transfer", sendMoney);

/* ================= HEALTH ================= */
app.get("/api/health", (req, res) => {
  res.json({ status: "Smart Pay running" });
});

/* ================= START ================= */
app.listen(PORT, () => {
  console.log(`🚀 Smart Pay running on port ${PORT}`);
});
