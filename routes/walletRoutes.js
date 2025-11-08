const express = require("express");
const router = express.Router();
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

// Path to wallet data file
const DATA_FILE = "wallets.json";

// Helper function to read wallets
function readWallets() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]");
  }
  const data = fs.readFileSync(DATA_FILE, "utf8");
  return JSON.parse(data || "[]");
}

// Helper function to save wallets
function saveWallets(wallets) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(wallets, null, 2));
}

/* -----------------------------------
   1️⃣ Create Wallet
----------------------------------- */
router.post("/create-wallet", (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Name is required" });
  }

  const wallets = readWallets();

  const newWallet = {
    id: uuidv4(),
    name,
    balance: 0,
    createdAt: new Date().toISOString(),
  };

  wallets.push(newWallet);
  saveWallets(wallets);

  res.json({
    message: "Wallet created successfully!",
    wallet: newWallet,
  });
});

/* -----------------------------------
   2️⃣ Get Wallet by ID
----------------------------------- */
router.get("/wallet/:id", (req, res) => {
  const walletId = req.params.id;
  const wallets = readWallets();

  const wallet = wallets.find((w) => w.id === walletId);

  if (!wallet) {
    return res.status(404).json({ message: "Wallet not found!" });
  }

  res.json({
    message: "Wallet found successfully!",
    wallet,
  });
});

module.exports = router;
