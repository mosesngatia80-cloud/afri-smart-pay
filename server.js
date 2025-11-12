const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");

dotenv.config();
const app = express();
app.use(bodyParser.json());

// Simple in-memory wallet storage
const wallets = {};

// Create Wallet
app.post("/api/create-wallet", (req, res) => {
  const walletId = "wallet_" + Date.now();
  wallets[walletId] = { balance: 0 };
  res.json({ message: "Wallet created successfully", walletId });
});

// Check Balance
app.get("/api/check-balance/:walletId", (req, res) => {
  const walletId = req.params.walletId;
  const wallet = wallets[walletId];

  if (!wallet) {
    return res.status(404).json({ message: "Wallet not found" });
  }

  res.json({ walletId, balance: wallet.balance });
});

// Top Up Wallet
app.post("/api/top-up", (req, res) => {
  const { walletId, amount } = req.body;
  const wallet = wallets[walletId];
// Send Money route
app.post("/api/send-money", (req, res) => {
  const { fromWalletId, toWalletId, amount } = req.body;

  if (!fromWalletId || !toWalletId || !amount) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const fromWallet = wallets[fromWalletId];
  const toWallet = wallets[toWalletId];

  if (!fromWallet || !toWallet) {
    return res.status(404).json({ message: "One or both wallets not found" });
  }

  if (fromWallet.balance < amount) {
    return res.status(400).json({ message: "Insufficient balance" });
  }

  fromWallet.balance -= amount;
  toWallet.balance += amount;

  return res.status(200).json({
    message: "Transfer successful",
    from: { walletId: fromWalletId, newBalance: fromWallet.balance },
    to: { walletId: toWalletId, newBalance: toWallet.balance }
  });
});
  if (!wallet) {
    return res.status(404).json({ message: "Wallet not found" });
  }

  wallet.balance += amount;
  res.json({ message: "Top-up successful", walletId, newBalance: wallet.balance });
});

// ✅ Send Money Route
app.post("/api/send-money", (req, res) => {
  const { fromWalletId, toWalletId, amount } = req.body;

  if (!fromWalletId || !toWalletId || !amount) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const fromWallet = wallets[fromWalletId];
  const toWallet = wallets[toWalletId];

  if (!fromWallet) {
    return res.status(404).json({ message: "Sender wallet not found" });
  }
  if (!toWallet) {
    return res.status(404).json({ message: "Receiver wallet not found" });
  }
  if (fromWallet.balance < amount) {
    return res.status(400).json({ message: "Insufficient funds" });
  }

  // Transfer logic
  fromWallet.balance -= amount;
  toWallet.balance += amount;

  res.json({
    message: "Transfer successful",
    fromWalletId,
    toWalletId,
    amount,
    fromNewBalance: fromWallet.balance,
    toNewBalance: toWallet.balance
  });
});

// ✅ Check Balance Route
app.post('/api/check-balance', (req, res) => {
  const { walletId } = req.body;
  const wallet = wallets[walletId];

  if (!wallet) {
    return res.status(404).json({ message: 'Wallet not found' });
  }

  res.json({
    message: 'Balance fetched successfully',
    walletId,
    balance: wallet.balance
  });
});// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
// =======================
// Transaction History Setup
// =======================
let transactions = [];

// Update top-up route to record transaction
app.post("/api/top-up", (req, res) => {
  const { walletId, amount } = req.body;
  const wallet = wallets[walletId];

  if (!wallet) {
    return res.status(404).json({ message: "Wallet not found" });
  }

  wallet.balance += amount;

  const tx = {
    type: "top-up",
    walletId,
    amount,
    date: new Date().toISOString()
  };
  transactions.push(tx);

  res.json({
    message: "Top-up successful",
    walletId,
    newBalance: wallet.balance,
  });
});

// Update send-money route to record transaction
app.post("/api/send-money", (req, res) => {
  const { fromWalletId, toWalletId, amount } = req.body;
  const fromWallet = wallets[fromWalletId];
  const toWallet = wallets[toWalletId];

  if (!fromWallet || !toWallet) {
    return res.status(404).json({ message: "One or both wallets not found" });
  }
  if (fromWallet.balance < amount) {
    return res.status(400).json({ message: "Insufficient balance" });
  }

  fromWallet.balance -= amount;
  toWallet.balance += amount;

  const tx = {
    type: "transfer",
    fromWalletId,
    toWalletId,
    amount,
    date: new Date().toISOString()
  };
  transactions.push(tx);

  res.json({
    message: "Transfer successful",
    fromWalletId,
    toWalletId,
    amount,
    fromNewBalance: fromWallet.balance,
    toNewBalance: toWallet.balance,
  });
});

// New route: Transaction History
app.get("/api/transaction-history/:walletId", (req, res) => {
  const walletId = req.params.walletId;
  const walletTransactions = transactions.filter(
    (tx) => tx.walletId === walletId || tx.fromWalletId === walletId || tx.toWalletId === walletId
  );

  res.json({
    message: "Transaction history retrieved successfully",
    walletId,
    transactions: walletTransactions,
  });
});
