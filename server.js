# stop any running node processes
pkill node || true

# backup current server.js just in case
mv server.js server.js.bak || true

# write new secure server.js (the file contents follow below)
cat > server.js <<'EOF'
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());

// basic rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ---------- MONGODB ----------
const MONGO_URI = process.env.MONGO_URI || '';
if (!MONGO_URI) {
  console.error('❌ MONGO_URI not set in .env');
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
    console.error('❌ MongoDB connection FAILED');
    console.error(err);
    process.exit(1);
  });

// ---------- MODELS ----------
const walletSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },
  role: { type: String, enum: ['customer', 'agent'], default: 'customer' },
  pinHash: { type: String, default: null }, // hashed PIN
  transactions: [
    {
      type: String, // allow legacy values; we'll normalize in code
      amount: Number,
      description: String,
      date: { type: Date, default: Date.now },
      meta: mongoose.Schema.Types.Mixed
    }
  ]
}, { timestamps: true });

const Wallet = mongoose.model('Wallet', walletSchema);

// ---------- HELPERS ----------
async function verifyPin(wallet, pin) {
  if (!wallet.pinHash) return false;
  return bcrypt.compare(String(pin), wallet.pinHash);
}

// normalize transaction type for new entries into 'credit' or 'debit'
function normalizeType(direction) {
  return direction === 'credit' ? 'credit' : 'debit';
}

// ---------- ROUTES ----------

// Health
app.get('/', (req, res) => res.json({ ok: true, service: 'Afri Smart Pay' }));

// Create wallet
app.post('/api/create-wallet', async (req, res) => {
  try {
    const { phone, role } = req.body;
    if (!phone) return res.status(400).json({ message: 'phone required' });

    const existing = await Wallet.findOne({ phone });
    if (existing) return res.status(400).json({ message: 'Wallet already exists' });

    const w = new Wallet({ phone, role: role || 'customer' });
    await w.save();
    res.json({ message: 'Wallet created successfully', wallet: { phone: w.phone, role: w.role, balance: w.balance } });
  } catch (err) {
    res.status(500).json({ message: 'Error creating wallet', error: err.toString() });
  }
});

// Set PIN (hashes)
app.post('/api/set-pin', async (req, res) => {
  try {
    const { phone, pin } = req.body;
    if (!phone || !pin) return res.status(400).json({ message: 'phone and pin required' });

    const wallet = await Wallet.findOne({ phone });
    if (!wallet) return res.status(404).json({ message: 'Wallet not found' });

    const salt = await bcrypt.genSalt(10);
    wallet.pinHash = await bcrypt.hash(String(pin), salt);
    await wallet.save();

    res.json({ message: 'PIN set successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Set PIN error', error: err.toString() });
  }
});

// Top up (no PIN)
app.post('/api/top-up', async (req, res) => {
  try {
    const { phone, amount } = req.body;
    if (!phone || typeof amount !== 'number') return res.status(400).json({ message: 'phone and numeric amount required' });

    const wallet = await Wallet.findOne({ phone });
    if (!wallet) return res.status(404).json({ message: 'Wallet not found' });

    wallet.balance += amount;
    wallet.transactions.push({ type: 'credit', amount, description: 'Top Up' });
    await wallet.save();

    res.json({ message: 'Top up successful', balance: wallet.balance });

  } catch (err) {
    res.status(500).json({ message: 'Top up error', error: err.toString() });
  }
});

// Send money (requires sender PIN)
app.post('/api/send-money', async (req, res) => {
  try {
    const { fromPhone, toPhone, amount, pin } = req.body;
    if (!fromPhone || !toPhone || typeof amount !== 'number' || !pin) return res.status(400).json({ message: 'fromPhone, toPhone, numeric amount and pin required' });

    const sender = await Wallet.findOne({ phone: fromPhone });
    const receiver = await Wallet.findOne({ phone: toPhone });

    if (!sender) return res.status(404).json({ message: 'Sender wallet not found' });
    if (!receiver) return res.status(404).json({ message: 'Receiver wallet not found' });

    const ok = await verifyPin(sender, pin);
    if (!ok) return res.status(401).json({ message: 'Invalid PIN' });

    if (sender.balance < amount) return res.status(400).json({ message: 'Insufficient balance' });

    // Perform transfer
    sender.balance -= amount;
    sender.transactions.push({ type: 'debit', amount, description: `Sent to ${toPhone}` });

    receiver.balance += amount;
    receiver.transactions.push({ type: 'credit', amount, description: `Received from ${fromPhone}` });

    await sender.save();
    await receiver.save();

    res.json({ message: 'Transfer successful', senderBalance: sender.balance });
  } catch (err) {
    res.status(500).json({ message: 'Send money error', error: err.toString() });
  }
});

// Deposit (Agent -> Customer) - agent must exist but no PIN required here (agent gives cash physically)
app.post('/api/deposit', async (req, res) => {
  try {
    const { agentPhone, customerPhone, amount } = req.body;
    if (!agentPhone || !customerPhone || typeof amount !== 'number') return res.status(400).json({ message: 'agentPhone, customerPhone, numeric amount required' });

    const agent = await Wallet.findOne({ phone: agentPhone });
    const customer = await Wallet.findOne({ phone: customerPhone });
    if (!agent) return res.status(404).json({ message: 'Agent or customer wallet not found' });

    customer.balance += amount;
    customer.transactions.push({ type: 'credit', amount, description: `Deposit by agent ${agentPhone}` });
    await customer.save();

    res.json({ message: 'Deposit successful', customerBalance: customer.balance });
  } catch (err) {
    res.status(500).json({ message: 'Deposit error', error: err.toString() });
  }
});

// Withdraw (Customer -> Agent) requires customer PIN
app.post('/api/withdraw', async (req, res) => {
  try {
    const { customerPhone, agentPhone, amount, pin } = req.body;
    if (!customerPhone || !agentPhone || typeof amount !== 'number' || !pin) return res.status(400).json({ message: 'customerPhone, agentPhone, numeric amount and pin required' });

    const customer = await Wallet.findOne({ phone: customerPhone });
    const agent = await Wallet.findOne({ phone: agentPhone });
    if (!customer || !agent) return res.status(404).json({ message: 'Customer or agent wallet not found' });

    const ok = await verifyPin(customer, pin);
    if (!ok) return res.status(401).json({ message: 'Invalid PIN' });

    if (customer.balance < amount) return res.status(400).json({ message: 'Insufficient customer balance' });

    customer.balance -= amount;
    customer.transactions.push({ type: 'debit', amount, description: `Withdrawal through agent ${agentPhone}` });
    await customer.save();

    res.json({ message: 'Withdrawal successful', customerBalance: customer.balance });
  } catch (err) {
    res.status(500).json({ message: 'Withdraw error', error: err.toString() });
  }
});

// Check balance
app.get('/api/check-balance/:phone', async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ phone: req.params.phone });
    if (!wallet) return res.status(404).json({ message: 'Wallet not found' });
    res.json({ balance: wallet.balance });
  } catch (err) {
    res.status(500).json({ message: 'Balance check error', error: err.toString() });
  }
});

// Transaction history (latest first)
app.get('/api/transactions/:phone', async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ phone: req.params.phone });
    if (!wallet) return res.status(404).json({ message: 'Wallet not found' });
    const tx = (wallet.transactions || []).slice().reverse();
    res.json(tx);
  } catch (err) {
    res.status(500).json({ message: 'Transaction error', error: err.toString() });
  }
});

// start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Afri Smart Pay API running on port ${PORT}`);
});
EOF

# create a .env file template (edit MONGO_URI to your actual connection string)
cat > .env <<'EENV'
# Replace with your actual connection string. Example:
# MONGO_URI=mongodb+srv://afriadmin:smartpay2025@afrismartpaycluster.jyab9fb.mongodb.net/AfriSmartPay?retryWrites=true&w=majority&appName=AfriSmartPayCluster
MONGO_URI=YOUR_MONGO_URI_HERE
PORT=3000
EENV

# install required npm packages
npm install express mongoose cors dotenv helmet express-rate-limit bcryptjs

# start the server
node server.js
