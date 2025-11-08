const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

let wallets = [];

// ✅ Create Wallet
router.post('/create-wallet', (req, res) => {
  const { name } = req.body;
  const newWallet = {
    id: uuidv4(),
    name,
    balance: 0,
    createdAt: new Date(),
  };
  wallets.push(newWallet);
  res.json({ message: 'Wallet created successfully!', wallet: newWallet });
});

// ✅ Get Wallet Balance
router.get('/:id/balance', (req, res) => {
  const wallet = wallets.find(w => w.id === req.params.id);
  if (!wallet) return res.status(404).json({ message: 'Wallet not found!' });
  res.json({ balance: wallet.balance });
});

// ✅ Send Money
router.post('/send', (req, res) => {
  const { senderId, receiverId, amount } = req.body;

  const sender = wallets.find(w => w.id === senderId);
  const receiver = wallets.find(w => w.id === receiverId);

  if (!sender || !receiver)
    return res.status(404).json({ message: 'Wallet not found!' });

  if (sender.balance < amount)
    return res.status(400).json({ message: 'Insufficient funds!' });

  sender.balance -= amount;
  receiver.balance += amount;

  res.json({
    message: 'Transfer successful!',
    sender: { id: sender.id, balance: sender.balance },
    receiver: { id: receiver.id, balance: receiver.balance },
  });
});

// ✅ Receive Money (optional, simple addition)
router.post('/receive', (req, res) => {
  const { receiverId, amount } = req.body;
  const receiver = wallets.find(w => w.id === receiverId);

  if (!receiver) return res.status(404).json({ message: 'Wallet not found!' });

  receiver.balance += amount;

  res.json({
    message: 'Amount received successfully!',
    wallet: receiver,
  });
});

module.exports = router;
