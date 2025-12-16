const Wallet = require("../models/Wallet"); // adjust if your model path differs

module.exports = async function checkBalance(req, res) {
  try {
    const { phone } = req.params;

    const wallet = await Wallet.findOne({ phone });

    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    return res.json({
      phone: wallet.phone,
      balance: wallet.balance,
    });
  } catch (error) {
    console.error("Check balance error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
