const express = require("express");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

// Temporary storage for wallets (for testing)
let wallets = [];

// Create wallet route
router.post("/create-wallet", (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Please provide a name" });
  }

  const newWallet = {
    id: uuidv4(),
    name,
    balance: 0,
    createdAt: new Date(),
  };

  wallets.push(newWallet);
  res.status(201).json({
    message: "Wallet created successfully!",
    wallet: newWallet,
  });
});

// Export router
module.exports = router;
