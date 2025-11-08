const express = require("express");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const router = express.Router();

const WALLET_FILE = "./wallets.json";

// Helper: Load wallets
function loadWallets() {
  if (!fs.existsSync(WALLET_FILE)) return [];
  const data = fs.readFileSync(WALLET_FILE);
  return JSON.parse(data);
}

// Helper: Save wallets
function saveWallets(wallets) {
  fs.writeFileSync(WALLET_FILE, JSON.stringify(wallets, null, 2));
}

// ✅ Create Wallet
router.post("/create-wallet", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Name is required" });

  const wallets = loadWallets();
  const newWallet = { id: uuidv4(), name, balance: 0, createdAt: new Date() };
  wallets.push(newWallet);
  saveWallets(wallets);

  res.json({ message: "Wallet created successfully!", wallet: newWallet });
});

// 💰 Get Wallet by ID
router.get("/wallet/:id", (req, res) => {
  const wallets = loadWallets();
  const wallet = wallets.find((w) => w.id === req.params.id);

  if (!wallet) return res.status(404).json({ message: "Wallet not found!" });
  res.json({ wallet });
});

// 🔄 Send Money Between Wallets
router.post("/wallet/send", (req, res) => {
  const { fromId, toId, amount } = req.body;
  if (!fromId || !toId || !amount)
    return res.status(400).json({ message: "fromId, toId, and amount are required" });

  const wallets = loadWallets();
  const sender = wallets.find((w) => w.id === fromId);
  const receiver = wallets.find((w) => w.id === toId);

  if (!sender || !receiver)
    return res.status(404).json({ message: "One or both wallets not found" });

  if (sender.balance < amount)
    return res.status(400).json({ message: "Insufficient balance" });

  sender.balance -= amount;
  receiver.balance += amount;
  saveWallets(wallets);

  res.json({
    message: "Transaction successful!",
    from: { id: sender.id, balance: sender.balance },
    to: { id: receiver.id, balance: receiver.balance },
  });
});

module.exports = router;
