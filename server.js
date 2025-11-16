const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

// Middleware
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("MongoDB Connected Successfully"))
.catch((err) => console.error("MongoDB Connection Error:", err));

// Wallet Schema
const walletSchema = new mongoose.Schema({
    phone: String,
    balance: { type: Number, default: 0 },
    history: { type: Array, default: [] },
});

const Wallet = mongoose.model("Wallet", walletSchema);

// Routes
app.post("/api/create-wallet", async (req, res) => {
    const { phone } = req.body;

    let wallet = await Wallet.findOne({ phone });
    if (!wallet) wallet = await Wallet.create({ phone });

    res.json({ message: "Wallet created", wallet });
});

app.get("/api/check-balance/:phone", async (req, res) => {
    const { phone } = req.params;

    const wallet = await Wallet.findOne({ phone });
    if (!wallet) return res.json({ balance: 0 });

    res.json({ balance: wallet.balance });
});

app.post("/api/top-up", async (req, res) => {
    const { phone, amount } = req.body;

    const wallet = await Wallet.findOne({ phone });
    if (!wallet) return res.json({ error: "Wallet not found" });

    wallet.balance += amount;
    wallet.history.push({ type: "top-up", amount, date: new Date() });

    await wallet.save();

    res.json({ message: "Top-up successful", wallet });
});

app.post("/api/send-money", async (req, res) => {
    const { sender, receiver, amount } = req.body;

    const senderWallet = await Wallet.findOne({ phone: sender });
    const receiverWallet = await Wallet.findOne({ phone: receiver });

    if (!senderWallet) return res.json({ error: "Sender wallet not found" });
    if (!receiverWallet) return res.json({ error: "Receiver wallet not found" });
    if (senderWallet.balance < amount)
        return res.json({ error: "Insufficient balance" });

    senderWallet.balance -= amount;
    receiverWallet.balance += amount;

    senderWallet.history.push({ type: "send", amount, to: receiver, date: new Date() });
    receiverWallet.history.push({ type: "receive", amount, from: sender, date: new Date() });

    await senderWallet.save();
    await receiverWallet.save();

    res.json({ message: "Transfer successful" });
});

// Root endpoint
app.get("/", (req, res) => {
    res.send("Afri Smart Pay API is running with MongoDB 🚀");
});

// Port
const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
