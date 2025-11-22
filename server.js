const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// ----------------------
// MONGO CONNECTION
// ----------------------
mongoose.connect("mongodb+srv://afriadmin:Afrismartpay2025@afrismartpaycluster.jyab9fb.mongodb.net/afri-smart-pay?retryWrites=true&w=majority&appName=AfriSmartPayCluster", {})
.then(() => console.log("MongoDB Connected"))
.catch(err => console.error("MongoDB Error:", err));


// ----------------------
// WALLET SCHEMA
// ----------------------
const walletSchema = new mongoose.Schema({
    phone: { type: String, unique: true },
    name: String,
    balance: { type: Number, default: 0 },
    pinHash: String,
    attempts: { type: Number, default: 0 },
    isLocked: { type: Boolean, default: false },
    transactions: [
        {
            type: { type: String },
            amount: Number,
            from: String,
            to: String,
            date: { type: Date, default: Date.now }
        }
    ]
});

const Wallet = mongoose.model("Wallet", walletSchema);


// ----------------------
// ROOT ROUTE
// ----------------------
app.get("/", (req, res) => {
    res.send("Welcome to Afri Smart Pay API 💳 — Connecting Africa through smart payments!");
});


// ----------------------
// CREATE WALLET
// ----------------------
app.post("/api/create-wallet", async (req, res) => {
    try {
        const { phone, name, pin } = req.body;

        if (!phone || !name || !pin) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const exists = await Wallet.findOne({ phone });
        if (exists) return res.status(400).json({ error: "Wallet already exists" });

        const hashed = await bcrypt.hash(pin, 10);

        const wallet = await Wallet.create({
            phone,
            name,
            pinHash: hashed
        });

        res.json({ message: "Wallet created successfully", wallet });

    } catch (err) {
        console.error("Create Wallet Error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});


// ----------------------
// CHECK BALANCE
// ----------------------
app.get("/api/check-balance/:phone", async (req, res) => {
    try {
        const wallet = await Wallet.findOne({ phone: req.params.phone });

        if (!wallet) return res.status(404).json({ error: "Wallet not found" });

        res.json({ balance: wallet.balance });

    } catch (err) {
        console.error("Balance Error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});


// ----------------------
// TOP UP
// ----------------------
app.post("/api/top-up", async (req, res) => {
    try {
        const { phone, amount } = req.body;

        const wallet = await Wallet.findOne({ phone });
        if (!wallet) return res.status(404).json({ error: "Wallet not found" });

        wallet.balance += Number(amount);

        wallet.transactions.push({
            type: "topup",
            amount,
            from: "SYSTEM",
            to: phone
        });

        await wallet.save();

        res.json({
            message: "Top-up successful",
            newBalance: wallet.balance
        });

    } catch (err) {
        console.error("Top-up Error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});


// ----------------------
// SEND MONEY (FULL SECURITY)
// ----------------------
app.post("/api/send-money", async (req, res) => {
    try {
        const { senderPhone, receiverPhone, amount, pin } = req.body;

        if (!senderPhone || !receiverPhone || !amount || !pin) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const sender = await Wallet.findOne({ phone: senderPhone });
        if (!sender) return res.status(404).json({ error: "Sender wallet not found" });

        if (sender.isLocked) {
            return res.status(403).json({ error: "Wallet locked due to too many wrong PIN attempts" });
        }

        const correctPin = await bcrypt.compare(pin, sender.pinHash);
        if (!correctPin) {
            sender.attempts += 1;

            if (sender.attempts >= 3) {
                sender.isLocked = true;
                await sender.save();
                return res.status(403).json({ error: "Wallet locked after 3 wrong PIN attempts" });
            }

            await sender.save();
            return res.status(401).json({
                error: "Incorrect PIN",
                remainingAttempts: 3 - sender.attempts
            });
        }

        sender.attempts = 0;
        await sender.save();

        if (amount <= 0) return res.status(400).json({ error: "Invalid amount" });

        if (sender.balance < amount) {
            return res.status(400).json({ error: "Insufficient balance" });
        }

        const receiver = await Wallet.findOne({ phone: receiverPhone });
        if (!receiver) {
            return res.status(404).json({ error: "Receiver wallet not found" });
        }

        sender.balance -= amount;
        receiver.balance += amount;

        sender.transactions.push({
            type: "debit",
            amount,
            from: senderPhone,
            to: receiverPhone
        });

        receiver.transactions.push({
            type: "credit",
            amount,
            from: senderPhone,
            to: receiverPhone
        });

        await sender.save();
        await receiver.save();

        return res.json({
            message: "Transfer successful",
            from: senderPhone,
            to: receiverPhone,
            amount,
            newBalance: sender.balance
        });

    } catch (err) {
        console.error("Send Money Error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});


// ----------------------
// TRANSACTION HISTORY
// ----------------------
app.get("/api/transaction-history/:phone", async (req, res) => {
    try {
        const wallet = await Wallet.findOne({ phone: req.params.phone });

        if (!wallet) return res.status(404).json({ error: "Wallet not found" });

        res.json({ transactions: wallet.transactions });

    } catch (err) {
        console.error("History Error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});


// ----------------------
// SERVER START
// ----------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Afri Smart Pay API running on port ${PORT}`);
});
