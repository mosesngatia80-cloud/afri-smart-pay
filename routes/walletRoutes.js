const express = require('express');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const walletsFile = './data/wallets.json';

// Helper: read wallet data
function readWallets() {
  if (!fs.existsSync(walletsFile)) {
    fs.writeFileSync(walletsFile, JSON.stringify([]));
  }
  const data = fs.readFileSync(walletsFile);
  return JSON.parse(data);
}

// Helper: write wallet data
function writeWallets(wallets) {
  fs.writeFileSync(walletsFile, JSON.stringify(wallets, null, 2));
}

// ✅ Create wallet
router.post('/create-wallet', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Name is required' });

  const wallets = readWallets();
  const newWallet = {
    id: uuidv4(),
    name,
    balance: 0,
    createdAt: new Date().toISOString()
  };

  wallets.push(newWallet);
  writeWallets(wallets);

  res.status(201).json({ message: 'Wallet created successfully!', wallet: newWallet });
});

// ✅ Check balance
router.get('/wallet/:id', (req, res) => {
  const wallets = readWallets();
  const wallet = wallets.find(w => w.id === req.params.id);

  if (!wallet) {
    return res.status(404).json({ message: 'Wallet not found!' });
  }

  res.json({ balance: wallet.balance, wallet });
});

// ✅ Send money
router.post('/send-money', (req, res) => {
  const { fromId, toId, amount } = req.body;
  if (!fromId || !toId || !amount) {
    return res.status(400).json({ message: 'fromId, toId, and amount are required' });
  }

  const wallets = readWallets();
  const sender = wallets.find(w => w.id === fromId);
  const receiver = wallets.find(w => w.id === toId);

  if (!sender || !receiver) {
    return res.status(404).json({ message: 'One or both wallets not found' });
  }

  if (sender.balance < amount) {
    return res.status(400).json({ message: 'Insufficient balance' });
  }

  sender.balance -= amount;
  receiver.balance += amount;
  writeWallets(wallets);

  res.json({
    message: 'Transfer successful!',
    sender: { id: sender.id, balance: sender.balance },
    receiver: { id: receiver.id, balance: receiver.balance }
  });
});

module.exports = router;
