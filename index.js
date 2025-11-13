
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware: safely parse JSON
app.use(bodyParser.json({
  strict: true,
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf); // Try parsing the JSON
    } catch (e) {
      throw new Error('INVALID_JSON');
    }
  }
}));

// Global error handler
app.use((err, req, res, next) => {
  if (err.message === 'INVALID_JSON') {
    return res.status(400).json({
      status: 'error',
      message: 'Malformed JSON in request body'
    });
  }
  console.error(err); // log other errors
  res.status(500).json({
    status: 'error',
    message: 'Internal Server Error'
  });
});

// =====================
// ROUTES
// =====================

// Homepage route
app.get('/', (req, res) => {
  res.send("Welcome to Afri Smart Pay API 💳 — Connecting Africa through smart payments!");
});

// Create Wallet
app.post('/api/create-wallet', (req, res) => {
  const data = req.body;
  res.json({
    status: 'success',
    message: 'Wallet created successfully',
    data
  });
});

// Check Balance
app.get('/api/check-balance', (req, res) => {
  const userId = req.query.userId;

  res.json({
    status: 'success',
    userId,
    balance: 0 // Placeholder value
  });
});

// Top Up Wallet
app.post('/api/top-up', (req, res) => {
  const { userId, amount } = req.body;

  res.json({
    status: 'success',
    message: 'Wallet topped up successfully',
    userId,
    newBalance: amount // Placeholder logic
  });
});

// Send Money
app.post('/api/send-money', (req, res) => {
  const { fromUser, toUser, amount } = req.body;

  res.json({
    status: 'success',
    message: 'Transfer completed successfully',
    transfer: { fromUser, toUser, amount }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
