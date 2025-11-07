const express = require("express");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(bodyParser.json());

// Temporary in-memory storage
let wallets = [];

// Home route
app.get("/", (req, res) => {
  res.send("Welcome to Afri Smart Pay API 💳 — Connecting Africa through smart payments!");
});

// Create wallet
app.post("/wallet/create", (req, res) => {
  const { owner } = req.body;
  if (!owner) return res.status(400).json({ message: "Owner is required" });

  const wallet = {
    id: uuidv4(),
    owner,
    balance: 0
  };

  wallets.push(wallet);
  res.json({ message: "Wallet created successfully", wallet });
});

// Check balance
app.get("/wallet/:id/balance", (req, res) => {
  const wallet = wallets.find(w => w.id === req.params.id);
  if (!wallet) return res.status(404).json({ message: "Wallet not found" });

  res.json({ owner: wallet.owner, balance: wallet.balance });
});

// Transfer funds
app.post("/wallet/transfer", (req, res) => {
  const { fromId, toId, amount } = req.body;

  if (!fromId || !toId || !amount) {
    return res.status(400).json({ message: "Missing transfer details" });
  }

  const sender = wallets.find(w => w.id === fromId);
  const receiver = wallets.find(w => w.id === toId);

  if (!sender || !receiver) {
    return res.status(404).json({ message: "One or both wallets not found" });
  }

  if (sender.balance < amount) {
    return res.status(400).json({ message: "Insufficient funds" });
  }

  sender.balance -= amount;
  receiver.balance += amount;

  res.json({
    message: "Transfer successful",
    from: sender.owner,
    to: receiver.owner,
    amount
  });
});

// Run server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Afri Smart Pay API running on port ${PORT}`));
