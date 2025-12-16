const Wallet = require("../models/Wallet.js");

module.exports = async function checkBalance(req, res) {
  try {
    const { phone } = req.params;

    if (!phone) {
      return res.status(400).json({ message: "Phone is required" });
    }

    const wallet = await Wallet.findOne({ phone });

    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    return res.json({
      phone: wallet.phone,
      balance: wallet.balance || 0,
    });
  } catch (error) {
    console.error("❌ Check balance error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
