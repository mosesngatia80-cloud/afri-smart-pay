const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

const sendMoney = async (req, res) => {
  try {
    const { from, to, amount } = req.body;

    if (!from || !to || !amount) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const sender = await Wallet.findOne({ phone: from });
    const receiver = await Wallet.findOne({ phone: to });

    if (!sender || !receiver) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    if (sender.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    sender.balance -= amount;
    receiver.balance += amount;

    await sender.save();
    await receiver.save();

    await Transaction.create({
      phone: from,
      amount,
      type: "SEND",
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = sendMoney;
