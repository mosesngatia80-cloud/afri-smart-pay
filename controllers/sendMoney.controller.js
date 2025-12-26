const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const bcrypt = require("bcryptjs");

const sendMoney = async (req, res) => {
  try {
    const { from, to, amount, pin } = req.body;

    if (!from || !to || !amount || !pin) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const sender = await Wallet.findOne({ phone: from }).select("+pin");
    const receiver = await Wallet.findOne({ phone: to });

    if (!sender || !receiver) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    if (!sender.pin) {
      return res.status(400).json({ message: "PIN not set" });
    }

    const isValid = await bcrypt.compare(pin.toString(), sender.pin);
    if (!isValid) {
      return res.status(400).json({ message: "Invalid PIN" });
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
      to,
    });

    return res.json({ success: true, message: "Transfer successful" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = sendMoney;
