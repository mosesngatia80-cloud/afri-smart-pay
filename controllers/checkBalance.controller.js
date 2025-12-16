const Wallet = require("../models/Wallet.js");

module.exports = async function checkBalance(req, res) {
  try {
    const { phone } = req.params;

    const wallet = await Wallet.findOne({ phone });

    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    return res.json({
      phone: wallet.phone,
      balance: wallet.balance || 0,
    });
  } catch (error) {
    console.error("❌ Check balance error FULL:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};
