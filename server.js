const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// ----------------------
//  MongoDB Connection
// ----------------------
mongoose.connect(
  "mongodb+srv://afriadmin:smartpay20@afrismartpaycluster.jyab9fb.mongodb.net/?retryWrites=true&w=majority&appName=AfriSmartPayCluster",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
).then(() => console.log("MongoDB connected"))
 .catch(err => console.log("MongoDB Error:", err));

// ----------------------
//  Wallet Schema
// ----------------------
const walletSchema = new mongoose.Schema({
  phone: { type: String, unique: true },
  balance: { type: Number, default: 0 },
  history: { type: Array, default: [] }
});

const Wallet = mongoose.model("Wallet", walletSchema);

// ----------------------
//  CREATE WALLET
// ----------------------
app.post("/api/create-wallet", async (req, res) => {
  try {
    const { phone } = req.body;

    let exists = await Wallet.findOne({ phone });
    if (exists) {
      return res.json({ message: "Wallet already exists", wallet: exists });
    }

    const wallet = new Wallet({ phone });
    await wallet.save();

    res.json({ message: "Wallet created successfully", wallet });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------
//  CHECK BALANCE
// ----------------------
app.post("/api/check-balance", async (req, res) => {
  try {
    const { phone } = req.body;

    let wallet = await Wallet.findOne({ phone });
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    res.json({
      message: "Balance retrieved successfully",
      balance: wallet.balance,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------
//  TOP UP
// ----------------------
app.post("/api/top-up", async (req, res) => {
  try {
    const { phone, amount } = req.body;

    let wallet = await Wallet.findOne({ phone });
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });

    wallet.balance += amount;
    wallet.history.push({
      type: "top-up",
      amount,
      date: new Date(),
    });

    await wallet.save();

    res.json({
      message: "Top up successful",
      balance: wallet.balance,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------
//  SEND MONEY
// ----------------------
app.post("/api/send-money", async (req, res) => {
  try {
    const { from, to, amount } = req.body;

    let sender = await Wallet.findOne({ phone: from });
    let receiver = await Wallet.findOne({ phone: to });

    if (!sender) return res.status(404).json({ message: "Sender not found" });
    if (!receiver) return res.status(404).json({ message: "Receiver not found" });

    if (sender.balance < amount) {
      return res.status(400).json({ message: "Insufficient funds" });
    }

    sender.balance -= amount;
    receiver.balance += amount;

    sender.history.push({
      type: "send",
      to,
      amount,
      date: new Date(),
    });

    receiver.history.push({
      type: "receive",
      from,
      amount,
      date: new Date(),
    });

    await sender.save();
    await receiver.save();

    res.json({
      message: "Money sent successfully",
      sender_balance: sender.balance,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------
//  TRANSACTION HISTORY
// ----------------------
app.post("/api/transaction-history", async (req, res) => {
  try {
    const { phone } = req.body;

    let wallet = await Wallet.findOne({ phone });
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    res.json({
      message: "Transaction history retrieved",
      history: wallet.history,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------
//  SERVER
// ----------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
