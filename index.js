const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 10000;

// In-memory wallet & transaction store (temporary; replace with DB later)
const wallets = {}; 
const transactions = [];

// Middleware: safely parse JSON
app.use(bodyParser.json({
  strict: true,
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      throw new Error('INVALID_JSON');
    }
  }
}));

// Global error handler
app.use((err, req, res, next) => {
  if (err && err.message === 'INVALID_JSON') {
    return res.status(400).json({
      status: 'error',
      message: 'Malformed JSON in request body'
    });
  }
  console.error(err);
  res.status(500).json({
    status: 'error',
    message: 'Internal Server Error'
  });
});

// =====================
// ROUTES
// =====================

// Homepage
app.get('/', (req, res) => {
  res.send("Welcome to Afri Smart Pay API 💳 — Connecting Africa through smart payments!");
});

// Create Wallet
app.post('/api/create-wallet', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ status: 'error', message: 'userId is required' });

  if (!wallets[userId]) {
    wallets[userId] = { balance: 0 };
    return res.json({
      status: 'success',
      message: 'Wallet created successfully',
      userId,
      balance: 0
    });
  }

  return res.json({
    status: 'success',
    message: 'Wallet already exists',
    userId,
    balance: wallets[userId].balance
  });
});

// Check Balance
app.get('/api/check-balance', (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ status: 'error', message: 'userId query param required' });
  }

  const wallet = wallets[userId];
  if (!wallet) {
    return res.status(404).json({ status: 'error', message: 'Wallet not found', userId });
  }

  return res.json({
    status: 'success',
    userId,
    balance: wallet.balance
  });
});

// Top Up Wallet
app.post('/api/top-up', (req, res) => {
  const { userId, amount } = req.body;

  if (!userId || amount == null) {
    return res.status(400).json({ status: 'error', message: 'userId and amount required' });
  }

  const num = Number(amount);
  if (isNaN(num) || num <= 0) {
    return res.status(400).json({ status: 'error', message: 'amount must be a positive number' });
  }

  if (!wallets[userId]) wallets[userId] = { balance: 0 };
  wallets[userId].balance += num;

  // record transaction
  transactions.push({
    id: transactions.length + 1,
    fromUser: 'SYSTEM',
    toUser: userId,
    amount: num,
    time: new Date().toISOString(),
    type: 'top-up'
  });

  return res.json({
    status: 'success',
    message: 'Wallet topped up successfully',
    userId,
    newBalance: wallets[userId].balance
  });
});

// Send Money (wallet → wallet)
app.post('/api/send-money', (req, res) => {
  const { fromUser, toUser, amount } = req.body;

  if (!fromUser || !toUser || amount == null) {
    return res.status(400).json({
      status: 'error',
      message: 'fromUser, toUser, and amount are required'
    });
  }

  if (fromUser === toUser) {
    return res.status(400).json({
      status: 'error',
      message: 'Cannot send money to the same account'
    });
  }

  const num = Number(amount);
  if (isNaN(num) || num <= 0) {
    return res.status(400).json({
      status: 'error',
      message: 'amount must be a positive number'
    });
  }

  if (!wallets[fromUser] || wallets[fromUser].balance < num) {
    return res.status(400).json({
      status: 'error',
      message: 'Insufficient balance or wallet not found',
      fromUser
    });
  }

  // Perform transfer
  wallets[fromUser].balance -= num;
  if (!wallets[toUser]) wallets[toUser] = { balance: 0 };
  wallets[toUser].balance += num;

  const tx = {
    id: transactions.length + 1,
    fromUser,
    toUser,
    amount: num,
    time: new Date().toISOString(),
    type: 'transfer'
  };

  transactions.push(tx);

  return res.json({
    status: 'success',
    message: 'Transfer completed successfully',
    transfer: tx,
    balances: {
      [fromUser]: wallets[fromUser].balance,
      [toUser]: wallets[toUser].balance
    }
  });
});

// Transaction History
app.get('/api/transaction-history', (req, res) => {
  const userId = req.query.userId;

  if (!userId) {
    return res.status(400).json({ status: 'error', message: 'userId query param required' });
  }

  const userTx = transactions.filter(
    t => t.fromUser === userId || t.toUser === userId
  );

  return res.json({
    status: 'success',
    userId,
    transactions: userTx
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
