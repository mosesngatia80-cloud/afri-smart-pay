const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// --------------------------------------------------
// 1. CONNECT TO MONGODB
// --------------------------------------------------
mongoose.connect(
  "mongodb+srv://afriadmin:smartpay2025@afrismartpaycluster.jyab9fb.mongodb.net/AfriSmartPay?retryWrites=true&w=majority&appName=AfriSmartPayCluster"
)
  .then(() => {
    console.log("✅ Connected to MongoDB");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection FAILED");
    console.error(err);
  });

// --------------------------------------------------
// 2. WALLET MODEL
// --------------------------------------------------
const walletSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },
  role: { type: String, enum: ["customer", "agent"], default: "customer" },
  transactions: [
    {
      type: { type: String, enum: ["credit", "debit"] },
      amount: Number,
      description: String,
      date: { type: Date, default: Date.now },
    },
  ],
});

const Wallet = mongoose.model("Wallet", walletSchema);

// --------------------------------------------------
// 3. CREATE WALLET
// --------------------------------------------------
app.post('/api/create-wallet', async (req, res) => {
  try {
    const { phone, role } = req.body;

    const existing = await Wallet.findOne({ phone });
    if (existing) return res.json({ message: "Wallet already exists" });

    const wallet = new Wallet({
      phone,
      role: role || "customer"
    });

    await wallet.save();
    res.json({ message: "Wallet created successfully", wallet });

  } catch (err) {
    res.status(500).json({ message: "Error creating wallet", error: err });
  }
});

// --------------------------------------------------
// 4. CHECK BALANCE
// --------------------------------------------------
app.get('/api/check-balance/:phone', async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ phone: req.params.phone });
    if (!wallet) return res.json({ message: "Wallet not found" });

    res.json({ balance: wallet.balance });

  } catch (err) {
    res.status(500).json({ message: "Balance check error", error: err });
  }
});

// --------------------------------------------------
// 5. TOP UP
// --------------------------------------------------
app.post('/api/top-up', async (req, res) => {
  try {
    const { phone, amount } = req.body;

    const wallet = await Wallet.findOne({ phone });
    if (!wallet) return res.json({ message: "Wallet not found" });

    wallet.balance += amount;
    wallet.transactions.push({
      type: "credit",
      amount,
      description: "Top Up",
    });

    await wallet.save();

    res.json({ message: "Top up successful", balance: wallet.balance });

  } catch (err) {
    res.status(500).json({ message: "Top up error", error: err });
  }
});

// --------------------------------------------------
// 6. SEND MONEY (Customer → Customer)
// --------------------------------------------------
app.post('/api/send-money', async (req, res) => {
  try {
    const { fromPhone, toPhone, amount } = req.body;

    const sender = await Wallet.findOne({ phone: fromPhone });
    const receiver = await Wallet.findOne({ phone: toPhone });

    if (!sender) return res.json({ message: "Sender wallet not found" });
    if (!receiver) return res.json({ message: "Receiver wallet not found" });
    if (sender.balance < amount) return res.json({ message: "Insufficient balance" });

    sender.balance -= amount;
    sender.transactions.push({
      type: "debit",
      amount,
      description: `Sent to ${toPhone}`,
    });

    receiver.balance += amount;
    receiver.transactions.push({
      type: "credit",
      amount,
      description: `Received from ${fromPhone}`,
    });

    await sender.save();
    await receiver.save();

    res.json({ message: "Transfer successful", senderBalance: sender.balance });

  } catch (err) {
    res.status(500).json({ message: "Send money error", error: err });
  }
});

// --------------------------------------------------
// 7. TRANSACTION HISTORY
// --------------------------------------------------
app.get('/api/transactions/:phone', async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ phone: req.params.phone });
    if (!wallet) return res.json({ message: "Wallet not found" });

    res.json(wallet.transactions);

  } catch (err) {
    res.status(500).json({ message: "Transaction error", error: err });
  }
});

// --------------------------------------------------
// 8. DEPOSIT (Agent → Customer)
// --------------------------------------------------
app.post('/api/deposit', async (req, res) => {
  try {
    const { agentPhone, customerPhone, amount } = req.body;

    const agent = await Wallet.findOne({ phone: agentPhone });
    const customer = await Wallet.findOne({ phone: customerPhone });

    if (!agent) return res.json({ message: "Agent wallet not found" });
    if (!customer) return res.json({ message: "Customer wallet not found" });

    customer.balance += amount;
    customer.transactions.push({
      type: "credit",
      amount,
      description: `Deposit by agent ${agentPhone}`,
    });

    await customer.save();

    res.json({
      message: "Deposit successful",
      customerBalance: customer.balance,
    });

  } catch (err) {
    res.status(500).json({ message: "Deposit error", error: err });
  }
});

// --------------------------------------------------
// 9. WITHDRAW (Customer → Agent)
// --------------------------------------------------
app.post('/api/withdraw', async (req, res) => {
  try {
    const { customerPhone, agentPhone, amount } = req.body;

    const customer = await Wallet.findOne({ phone: customerPhone });
    const agent = await Wallet.findOne({ phone: agentPhone });

    if (!customer) return res.json({ message: "Customer wallet not found" });
    if (!agent) return res.json({ message: "Agent wallet not found" });
    if (customer.balance < amount) return res.json({ message: "Insufficient customer balance" });

    customer.balance -= amount;
    customer.transactions.push({
      type: "debit",
      amount,
      description: `Withdrawal through agent ${agentPhone}`,
    });

    await customer.save();

    res.json({
      message: "Withdrawal successful",
      customerBalance: customer.balance,
    });

  } catch (err) {
    res.status(500).json({ message: "Withdraw error", error: err });
  }
});

// --------------------------------------------------
// 10. START SERVER
// --------------------------------------------------
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Afri Smart Pay API running on port ${PORT}`);
});
