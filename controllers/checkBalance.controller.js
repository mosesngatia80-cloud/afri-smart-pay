import Wallet from "../models/Wallet.js";

export const checkBalance = async (req, res) => {
  try {
    const { phone } = req.params;

    const wallet = await Wallet.findOne({ phone });

    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    return res.json({
      phone: wallet.phone,
      balance: wallet.balance
    });

  } catch (error) {
    console.error("❌ CHECK BALANCE ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
