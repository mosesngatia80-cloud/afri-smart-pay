const express = require('express');
const app = express();
app.use(express.json());

let wallets = {}; 
let transactions = [];
let txId = 1;

// Validate helper
function validateString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

// Create wallet
app.post('/api/create-wallet', (req, res) => {
  const { userId } = req.body;

  if (!validateString(userId)) {
    return res.status(400).json({ status: "error", message: "Invalid or missing userId" });
  }

  if (wallets[userId]) {
    return res.status(400).json({ status: "error", message: "Wallet already exists" });
  }

  wallets[userId] = { balance: 0 };
  return res.json({ status: "success", message: "Wallet created successfully", userId, balance: 0 });
});

// Top-up
app.post('/api/top-up', (req, res) => {
  const { userId, amount } = req.body;

  if (!validateString(userId)) {
    return res.status(400).json({ status: "error", message: "Invalid userId" });
  }

  if (typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({ status: "error", message: "Invalid amount" });
  }

  if (!wallets[userId]) {
    return res.status(404).json({ status: "error", message: "Wallet not found" });
  }

  wallets[userId].balance += amount;

  transactions.push({
    id: txId++,
    fromUser: "SYSTEM",
    toUser: userId,
    amount,
    time: new Date(),
    type: "top-up"
  });

  return res.json({
    status: "success",
    message: "Wallet topped up successfully",
    userId,
    newBalance: wallets[userId].balance
  });
});

// Send money
app.post('/api/send-money', (req, res) => {
  const { fromUser, toUser, amount } = req.body;

  if (!validateString(fromUser) || !validateString(toUser)) {
    return res.status(400).json({ status: "error", message: "Invalid fromUser or toUser" });
  }

  if (fromUser === toUser) {
    return res.status(400).json({ status: "error", message: "Sender and receiver cannot be the same" });
  }

  if (typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({ status: "error", message: "Invalid amount" });
  }

  if (!wallets[fromUser] || !wallets[toUser]) {
    return res.status(404).json({ status: "error", message: "One or both wallets not found" });
  }

  if (wallets[fromUser].balance < amount) {
    return res.status(400).json({ status: "error", message: "Insufficient balance" });
  }

  wallets[fromUser].balance -= amount;
  wallets[toUser].balance += amount;

  const transferRecord = {
    id: txId++,
    fromUser,
    toUser,
    amount,
    time: new Date(),
    type: "transfer"
  };

  transactions.push(transferRecord);

  return res.json({
    status: "success",
    message: "Transfer completed successfully",
    transfer: transferRecord
  });
});

// Check balance
app.get('/api/check-balance', (req, res) => {
  const { userId } = req.query;

  if (!validateString(userId)) {
    return res.status(400).json({ status: "error", message: "Invalid userId" });
  }

  if (!wallets[userId]) {
    return res.status(404).json({ status: "error", message: "Wallet not found" });
  }

  return res.json({
    status: "success",
    userId,
    balance: wallets[userId].balance
  });
});

// Transaction history
app.get('/api/transaction-history', (req, res) => {
  const { userId } = req.query;

  if (!validateString(userId)) {
    return res.status(400).json({ status: "error", message: "Invalid userId" });
  }

  const userTransactions = transactions.filter(t =>
    t.fromUser === userId || t.toUser === userId
  );

  return res.json({
    status: "success",
    userId,
    transactions: userTransactions
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
