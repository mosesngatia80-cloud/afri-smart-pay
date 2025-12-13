import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bodyParser from "body-parser";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

import Wallet from "./models/Wallet.js";
import paypalRoutes from "./routes/paypal.routes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ==================================================
// MONGODB CONNECTION
// ==================================================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ MongoDB Error:", err.message));

// ==================================================
// CREATE WALLET
// ==================================================
app.post("/api/create-wallet", async (req, res) => {
  try {
    const { phone, pin } = req.body;

    const exists = await Wallet.findOne({ phone });
    if (exists) return res.json({ message: "Wallet already exists" });

    const hashedPin = await bcrypt.hash(pin, 10);

    const wallet = new Wallet({
      phone,
      pin: hashedPin,
      balance: 0,
      transactions: [],
    });

    await wallet.save();
    res.json({ message: "Wallet created successfully", wallet });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================================================
// CHECK BALANCE
// ==================================================
app.get("/api/check-balance/:phone", async (req, res) => {
  const wallet = await Wallet.findOne({ phone: req.params.phone });
  res.json({ balance: wallet ? wallet.balance : 0 });
});

// ==================================================
// TOP UP WALLET (manual / internal)
// ==================================================
app.post("/api/top-up", async (req, res) => {
  const { phone, amount } = req.body;
  const wallet = await Wallet.findOne({ phone });
  if (!wallet) return res.json({ message: "Wallet not found" });

  wallet.balance += amount;
  wallet.transactions.push({ type: "top-up", amount, date: new Date() });
  await wallet.save();

  res.json({ message: "Top up successful", balance: wallet.balance });
});

// ==================================================
// SEND MONEY
// ==================================================
app.post("/api/send-money", async (req, res) => {
  const { sender, receiver, amount, pin } = req.body;

  const senderWallet = await Wallet.findOne({ phone: sender });
  const receiverWallet = await Wallet.findOne({ phone: receiver });

  if (!senderWallet || !receiverWallet)
    return res.json({ message: "Wallet not found" });

  const pinMatch = await bcrypt.compare(pin, senderWallet.pin);
  if (!pinMatch) return res.json({ message: "Incorrect PIN" });

  if (senderWallet.balance < amount)
    return res.json({ message: "Insufficient funds" });

  senderWallet.balance -= amount;
  receiverWallet.balance += amount;

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
});

// ==================================================
// TRANSACTION HISTORY
// ==================================================
app.get("/api/transaction-history/:phone", async (req, res) => {
  const wallet = await Wallet.findOne({ phone: req.params.phone });
  res.json({ transactions: wallet ? wallet.transactions : [] });
});

// ==================================================
// PAYPAL ROUTES
// ==================================================
app.use("/api/paypal", paypalRoutes);

// ==================================================
// START SERVER
// ==================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Afri Smart Pay API running on port ${PORT}`)
);
