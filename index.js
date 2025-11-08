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

// Example route: create wallet
app.post('/api/create-wallet', (req, res) => {
  // Your wallet creation logic here
  res.json({ status: 'success', data: req.body });
});

// Example route: send money
app.post('/api/send-money', (req, res) => {
  // Your send money logic here
  res.json({ status: 'success', data: req.body });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
