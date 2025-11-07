const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
const walletRoutes = require('./routes/walletRoutes');
app.use('/api', walletRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('Welcome to Afri Smart Pay API 💳 — Connecting Africa through smart payments!');
});

// Server listen
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
