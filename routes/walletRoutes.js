const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// ---------------------------
// WALLET MODEL
// ---------------------------
const walletSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true },
    balance: { type: Number, default: 0 },
    history: [
        {
            type: { type: String },   // top-up, send, receive
            amount: Number,
            to: String,
            from: String,
            date: { type: Date, default: Date.now }
        }
    ]
});

const Wallet = mongoose.model("Wallet", walletSchema);

// ---------------------------
// CREATE WALLET
// ---------------------------
router.post("/create-wallet", async (req, res) => {
    try {
        const { phone } = req.body;

        let wallet = await Wallet.findOne({ phone });
        if (wallet) {
            return res.json({ message: "Wallet already exists", wallet });
        }

        wallet = await Wallet.create({ phone });
        res.json({ message: "Wallet created successfully", wallet });
    } catch (error) {
        res.status(500).json({ error: "Server error", details: error.message });
    }
});


// ---------------------------
// CHECK BALANCE
// ---------------------------
router.get("/check-balance/:phone", async (req, res) => {
    try {
        const { phone } = req.params;

        const wallet = await Wallet.findOne({ phone });
        if (!wallet) return res.json({ phone, balance: 0 });

        res.json({ phone, balance: wallet.balance });
    } catch (error) {
        res.status(500).json({ error: "Server error", details: error.message });
    }
});


// ---------------------------
// TOP UP WALLET
// ---------------------------
router.post("/top-up", async (req, res) => {
    try {
        const { phone, amount } = req.body;

        const wallet = await Wallet.findOne({ phone });
        if (!wallet) return res.json({ error: "Wallet not found" });

        wallet.balance += Number(amount);

        wallet.history.push({
            type: "top-up",
            amount,
            date: new Date()
        });

        await wallet.save();

        res.json({ message: "Top-up successful", balance: wallet.balance });
    } catch (error) {
        res.status(500).json({ error: "Server error", details: error.message });
    }
});


// ---------------------------
// SEND MONEY
// ---------------------------
router.post("/send-money", async (req, res) => {
    try {
        const { sender, receiver, amount } = req.body;

        const senderWallet = await Wallet.findOne({ phone: sender });
        const receiverWallet = await Wallet.findOne({ phone: receiver });

        if (!senderWallet) return res.json({ error: "Sender wallet not found" });
        if (!receiverWallet) return res.json({ error: "Receiver wallet not found" });

        if (senderWallet.balance < amount)
            return res.json({ error: "Insufficient balance" });

        // Perform transfer
        senderWallet.balance -= amount;
        receiverWallet.balance += amount;

        senderWallet.history.push({
            type: "send",
            amount,
            to: receiver,
            date: new Date()
        });

        receiverWallet.history.push({
            type: "receive",
            amount,
            from: sender,
            date: new Date()
        });

        await senderWallet.save();
        await receiverWallet.save();

        res.json({ message: "Transfer successful" });
    } catch (error) {
        res.status(500).json({ error: "Server error", details: error.message });
    }
});


// ---------------------------
// GET TRANSACTION HISTORY
// ---------------------------
router.get("/history/:phone", async (req, res) => {
    try {
        const { phone } = req.params;

        const wallet = await Wallet.findOne({ phone });

        if (!wallet) {
            return res.status(404).json({ error: "Wallet not found" });
        }

        res.json({
            phone,
            history: wallet.history
        });

    } catch (error) {
        res.status(500).json({ error: "Server error", details: error.message });
    }
});


// ---------------------------
module.exports = router;
