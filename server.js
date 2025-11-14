require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// MongoDB setup
const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error("❌ ERROR: MONGODB_URI is missing in .env");
    process.exit(1);
}

const client = new MongoClient(uri);

let db;
let walletsCollection;
let transactionsCollection;

// CONNECT TO DB
async function connectDB() {
    try {
        await client.connect();
        db = client.db("AfriSmartPay");
        walletsCollection = db.collection("wallets");
        transactionsCollection = db.collection("transactions");

        await walletsCollection.createIndex({ phone: 1 }, { unique: true });

        console.log("🌍 MongoDB connected successfully");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1);
    }
}
connectDB();

// HOME ROUTE
app.get('/', (req, res) => {
    res.send("Welcome to Afri Smart Pay API 💳 (MongoDB Version)");
});


// ------------------- CREATE WALLET -------------------
app.post('/api/create-wallet', async (req, res) => {
    const { phone, pin } = req.body;

    if (!phone || !pin)
        return res.status(400).json({ error: "Phone and pin are required." });

    try {
        const exists = await walletsCollection.findOne({ phone });
        if (exists) return res.status(400).json({ error: "Wallet already exists." });

        const hashedPin = await bcrypt.hash(pin, 10);

        const wallet = {
            phone,
            pin: hashedPin,
            balance: 0,
            createdAt: new Date()
        };

        await walletsCollection.insertOne(wallet);
        res.json({ message: "Wallet created successfully.", phone });
    } catch (err) {
        res.status(500).json({ error: "Server error." });
    }
});


// ------------------- CHECK BALANCE -------------------
app.get('/api/check-balance', async (req, res) => {
    const { phone } = req.query;

    if (!phone)
        return res.status(400).json({ error: "Phone is required." });

    try {
        const wallet = await walletsCollection.findOne({ phone });
        if (!wallet) return res.status(404).json({ error: "Wallet not found." });

        res.json({ phone, balance: wallet.balance });
    } catch (err) {
        res.status(500).json({ error: "Server error." });
    }
});


// ------------------- TOP UP -------------------
app.post('/api/top-up', async (req, res) => {
    const { phone, amount } = req.body;

    if (!phone || amount == null)
        return res.status(400).json({ error: "Phone & amount required." });

    const amt = Number(amount);
    if (amt <= 0) return res.status(400).json({ error: "Invalid amount." });

    try {
        const updated = await walletsCollection.findOneAndUpdate(
            { phone },
            { $inc: { balance: amt } },
            { returnDocument: "after" }
        );

        if (!updated.value)
            return res.status(404).json({ error: "Wallet not found." });

        res.json({
            message: "Top-up successful.",
            phone,
            amount: amt,
            newBalance: updated.value.balance
        });
    } catch (err) {
        res.status(500).json({ error: "Server error." });
    }
});


// ------------------- SEND MONEY (WITH PIN + ATOMIC) -------------------
app.post('/api/send-money', async (req, res) => {
    const { from, to, amount, pin } = req.body;

    const amt = Number(amount);
    if (!from || !to || amt <= 0 || !pin)
        return res.status(400).json({ error: "Invalid request." });

    const session = client.startSession();

    try {
        let result;

        await session.withTransaction(async () => {
            const sender = await walletsCollection.findOne({ phone: from }, { session });
            if (!sender) throw new Error("Sender not found");

            const match = await bcrypt.compare(pin, sender.pin);
            if (!match) throw new Error("Invalid PIN");

            if (sender.balance < amt) throw new Error("Insufficient balance");

            const receiver = await walletsCollection.findOne({ phone: to }, { session });
            if (!receiver) throw new Error("Receiver not found");

            await walletsCollection.updateOne(
                { phone: from },
                { $inc: { balance: -amt } },
                { session }
            );

            await walletsCollection.updateOne(
                { phone: to },
                { $inc: { balance: amt } },
                { session }
            );

            const tx = {
                from,
                to,
                amount: amt,
                date: new Date()
            };

            await transactionsCollection.insertOne(tx, { session });

            result = {
                senderBalance: sender.balance - amt,
                receiverBalance: receiver.balance + amt
            };
        });

        res.json({
            message: "Transfer successful.",
            from,
            to,
            amount: amt,
            senderBalance: result.senderBalance,
            receiverBalance: result.receiverBalance
        });

    } catch (err) {
        if (err.message === "Sender not found" || err.message === "Receiver not found")
            return res.status(404).json({ error: err.message });

        if (err.message === "Invalid PIN")
            return res.status(400).json({ error: "Invalid PIN" });

        if (err.message === "Insufficient balance")
            return res.status(400).json({ error: "Insufficient balance" });

        res.status(500).json({ error: "Transaction failed." });
    } finally {
        session.endSession();
    }
});


// ------------------- TRANSACTION HISTORY -------------------
app.get('/api/transaction-history', async (req, res) => {
    try {
        const list = await transactionsCollection.find({})
            .sort({ date: -1 })
            .toArray();

        res.json({ total: list.length, transactions: list });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});


// ------------------- USER TRANSACTIONS -------------------
app.get('/api/user-transactions', async (req, res) => {
    const { phone } = req.query;

    if (!phone)
        return res.status(400).json({ error: "Phone required." });

    try {
        const list = await transactionsCollection.find({
            $or: [{ from: phone }, { to: phone }]
        })
            .sort({ date: -1 })
            .toArray();

        res.json({ phone, total: list.length, transactions: list });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});


// ------------------- RESET PIN -------------------
app.post('/api/reset-pin', async (req, res) => {
    const { phone } = req.body;

    if (!phone)
        return res.status(400).json({ error: "Phone required." });

    try {
        const wallet = await walletsCollection.findOne({ phone });
        if (!wallet) return res.status(404).json({ error: "Wallet not found." });

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 30 * 60 * 1000);

        await walletsCollection.updateOne(
            { phone },
            { $set: { resetCode: code, resetCodeExpires: expires } }
        );

        res.json({
            message: "Reset code generated.",
            phone,
            code
        });

    } catch (err) {
        res.status(500).json({ error: "Server error." });
    }
});


// ------------------- CONFIRM RESET CODE -------------------
app.post('/api/confirm-reset', async (req, res) => {
    const { phone, code, newPin } = req.body;

    if (!phone || !code || !newPin)
        return res.status(400).json({ error: "All fields required." });

    try {
        const wallet = await walletsCollection.findOne({ phone });

        if (!wallet) return res.status(404).json({ error: "Wallet not found." });

        if (wallet.resetCode !== code)
            return res.status(400).json({ error: "Invalid code." });

        if (new Date(wallet.resetCodeExpires) < new Date())
            return res.status(400).json({ error: "Reset code expired." });

        const hashedPin = await bcrypt.hash(newPin, 10);

        await walletsCollection.updateOne(
            { phone },
            { $set: { pin: hashedPin }, $unset: { resetCode: "", resetCodeExpires: "" } }
        );

        res.json({ message: "PIN reset successful." });

    } catch (err) {
        res.status(500).json({ error: "Server error." });
    }
});


// START SERVER
app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
});
