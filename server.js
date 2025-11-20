const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

// Initialize App
const app = express();
app.use(bodyParser.json());

// MongoDB Connection
mongoose.connect(
  "mongodb+srv://afriadmin:AfriSmartPay2025@afrismartpaycluster.jyab9fb.mongodb.net/AfriSmartPay?retryWrites=true&w=majority&appName=AfriSmartPay"
)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log("MongoDB Error:", err));


// Wallet Schema
const walletSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },
  transactions: { type: Array, default: [] }
});

const Wallet = mongoose.model("Wallet", walletSchema);



// ✅ ROUTE: Create Wallet
app.post("/api/create-wallet", async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    const exists = await Wallet.findOne({ phone });
    if (exists) {
      return res.status(400).json({ error: "Wallet already exists" });
    }

    const wallet = new Wallet({ phone });
    await wallet.save();

    res.json({ message: "Wallet created successfully", wallet });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// ✅ ROUTE: Check Balance
app.get("/api/check-balance/:phone", async (req, res) => {
  try {
    const { phone } = req.params;

    const wallet = await Wallet.findOne({ phone });
    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    res.json({ balance: wallet.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// ✅ ROUTE: Top-Up Wallet
app.post("/api/top-up", async (req, res) => {
  try {
    const { phone, amount } = req.body;

    if (!phone || !amount) {
      return res.status(400).json({ error: "Phone and amount are required" });
    }

    const wallet = await Wallet.findOne({ phone });
    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    wallet.balance += amount;

    wallet.transactions.push({
      type: "TOP-UP",
      amount,
      date: new Date()
    });

    await wallet.save();

    res.json({ message: "Wallet topped up", balance: wallet.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// ✅ ROUTE: Send Money Wallet-to-Wallet
app.post("/api/send-money", async (req, res) => {
  try {
    const { sender, receiver, amount } = req.body;

    if (!sender || !receiver || !amount) {
      return res.status(400).json({ error: "sender, receiver, amount required" });
    }

    const senderWallet = await Wallet.findOne({ phone: sender });
    const receiverWallet = await Wallet.findOne({ phone: receiver });

    if (!senderWallet) return res.status(404).json({ error: "Sender wallet not found" });
    if (!receiverWallet) return res.status(404).json({ error: "Receiver wallet not found" });

    if (senderWallet.balance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    senderWallet.balance -= amount;
    receiverWallet.balance += amount;

    senderWallet.transactions.push({
      type: "SEND",
      to: receiver,
      amount,
      date: new Date()
    });

    receiverWallet.transactions.push({
      type: "RECEIVE",
      from: sender,
      amount,
      date: new Date()
    });

    await senderWallet.save();
    await receiverWallet.save();

    res.json({ message: "Money sent successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// ✅ ROUTE: Transaction History
app.get("/api/transaction-history/:phone", async (req, res) => {
  try {
    const { phone } = req.params;

    const wallet = await Wallet.findOne({ phone });
    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    res.json({ transactions: wallet.transactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// Default Route
app.get("/", (req, res) => {
  res.send("Welcome to Afri Smart Pay API 💳 — Mock API Version");
});



// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

