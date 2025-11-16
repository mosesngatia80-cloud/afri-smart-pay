const express = require("express");
const router = express.Router();

// Temporary in-memory wallet storage
let users = {}; 
// Structure:
// users[phone] = { balance: 0, history: [] }

// Create wallet
router.post("/create-wallet", (req, res) => {
    const { phone } = req.body;

    if (!phone) return res.status(400).json({ error: "Phone number is required" });

    if (users[phone]) {
        return res.status(400).json({ error: "Wallet already exists" });
    }

    users[phone] = { balance: 0, history: [] };

    res.json({ 
        message: "Wallet created successfully", 
        wallet: users[phone] 
    });
});

// Check balance
router.get("/check-balance/:phone", (req, res) => {
    const { phone } = req.params;

    if (!users[phone]) {
        return res.status(404).json({ error: "Wallet not found" });
    }

    res.json({ 
        phone, 
        balance: users[phone].balance 
    });
});

// Top-up wallet
router.post("/top-up", (req, res) => {
    const { phone, amount } = req.body;

    if (!users[phone]) return res.status(404).json({ error: "Wallet not found" });
    if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });

    users[phone].balance += amount;

    users[phone].history.push({
        type: "top-up",
        amount,
        time: new Date()
    });

    res.json({
        message: "Top-up successful",
        newBalance: users[phone].balance
    });
});

// Send money between wallets
router.post("/send-money", (req, res) => {
    const { sender, receiver, amount } = req.body;

    if (!users[sender]) return res.status(404).json({ error: "Sender wallet not found" });
    if (!users[receiver]) return res.status(404).json({ error: "Receiver wallet not found" });
    if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });

    if (users[sender].balance < amount) {
        return res.status(400).json({ error: "Insufficient balance" });
    }

    users[sender].balance -= amount;
    users[receiver].balance += amount;

    // Add logs
    users[sender].history.push({
        type: "send",
        to: receiver,
        amount,
        time: new Date()
    });

    users[receiver].history.push({
        type: "receive",
        from: sender,
        amount,
        time: new Date()
    });

    res.json({ message: "Transfer successful" });
});

// Transaction history
router.get("/history/:phone", (req, res) => {
    const { phone } = req.params;

    if (!users[phone]) return res.status(404).json({ error: "Wallet not found" });

    res.json({
        phone,
        history: users[phone].history
    });
});

module.exports = router;
