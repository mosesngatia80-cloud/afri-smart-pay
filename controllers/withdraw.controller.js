const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

const withdraw = async (req, res) => {
  try {
    const { phone, amount } = req.body;

    const wallet = await Wallet.findOne({ phone });
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    wallet.balance -= amount;
    await wallet.save();

    await Transaction.create({
      phone,
      amount,
      type: "WITHDRAW",
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = withdraw;
