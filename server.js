import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bodyParser from "body-parser";
import bcrypt from "bcryptjs";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ================================
//  DIRECT MONGODB CONNECTION
// ================================
mongoose
  .connect(
    "mongodb+srv://afriadmin:NgatiaAfr1Pay2025@afrismartpaycluster.jyab9fb.mongodb.net/afrismpaydb?retryWrites=true&w=majority&appName=AfriSmartPayCluster"
  )
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Error:", err));


// ================================
//  WALLET SCHEMA
// ================================
const walletSchema = new mongoose.Schema({
  phone: { type: String, unique: true },
  balance: { type: Number, default: 0 },
  pin: { type: String },
  transactions: { type: Array, default: [] },
});

const Wallet = mongoose.model("Wallet", walletSchema);


// ================================
//  CREATE WALLET
// ================================
app.post("/api/create-wallet", async (req, res) => {
  try {
    const { phone, pin } = req.body;

    const existing = await Wallet.findOne({ phone });
    if (existing) {
      return res.json({ message: "Wallet already exists" });
    }

    const hashedPin = await bcrypt.hash(pin, 10);

    const wallet = new Wallet({
      phone,
      pin: hashedPin,
      balance: 0,
      transactions: [],
    });

    await wallet.save();

    res.json({ message: "Wallet created successfully", wallet });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ================================
//  CHECK BALANCE
// ================================
app.get("/api/check-balance/:phone", async (req, res) => {
  try {
    const phone = req.params.phone;

    const wallet = await Wallet.findOne({ phone });
    if (!wallet) return res.json({ balance: 0 });

    res.json({ balance: wallet.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ================================
//  TOP UP WALLET
// ================================
app.post("/api/top-up", async (req, res) => {
  try {
    const { phone, amount } = req.body;

    const wallet = await Wallet.findOne({ phone });
    if (!wallet) return res.json({ message: "Wallet not found" });

    wallet.balance += amount;

    wallet.transactions.push({
      type: "top-up",
      amount,
      date: new Date(),
    });

    await wallet.save();

    res.json({ message: "Top up successful", balance: wallet.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ================================
//  SEND MONEY
// ================================
app.post("/api/send-money", async (req, res) => {
  try {
    const { sender, receiver, amount, pin } = req.body;

    const senderWallet = await Wallet.findOne({ phone: sender });
    const receiverWallet = await Wallet.findOne({ phone: receiver });

    if (!senderWallet) return res.json({ message: "Sender wallet not found" });
    if (!receiverWallet) return res.json({ message: "Receiver wallet not found" });

    const pinMatch = await bcrypt.compare(pin, senderWallet.pin);
    if (!pinMatch) return res.json({ message: "Incorrect PIN" });

    if (senderWallet.balance < amount) {
      return res.json({ message: "Insufficient funds" });
    }

    // Update balances
    senderWallet.balance -= amount;
    receiverWallet.balance += amount;

    // Log transactions
    senderWallet.transactions.push({
      type: "send",
      amount,
      to: receiver,
      date: new Date(),
    });

    receiverWallet.transactions.push({
      type: "receive",
      amount,
      from: sender,
      date: new Date(),
    });

    await senderWallet.save();
    await receiverWallet.save();

    res.json({ message: "Transfer successful" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ================================
//  TRANSACTION HISTORY
// ================================
app.get("/api/transaction-history/:phone", async (req, res) => {
  try {
    const phone = req.params.phone;

    const wallet = await Wallet.findOne({ phone });
    if (!wallet) return res.json({ transactions: [] });

    res.json({ transactions: wallet.transactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ================================
//  START SERVER
// ================================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Afri Smart Pay API running on port ${PORT}`);
});
