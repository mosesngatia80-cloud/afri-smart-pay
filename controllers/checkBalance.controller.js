const Wallet = require("../models/Wallet");

async function checkBalance(req, res) {
  try {
    const { phone } = req.params;

    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    const wallet = await Wallet.findOne({ phone });

    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    return res.json({
      phone: wallet.phone,
      balance: wallet.balance,
    });
  } catch (err) {
    console.error("Check balance error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

module.exports = { checkBalance };
