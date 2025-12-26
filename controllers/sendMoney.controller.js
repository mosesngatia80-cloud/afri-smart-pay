const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const bcrypt = require("bcryptjs");

const sendMoney = async (req, res) => {
  try {
    const { from, to, amount, pin } = req.body;

    // 1️⃣ Validate input
    if (!from || !to || !amount || !pin) {
      return res.status(400).json({ message: "Missing fields" });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    // 2️⃣ Find wallets
    const sender = await Wallet.findOne({ phone: from });
    const receiver = await Wallet.findOne({ phone: to });

    if (!sender || !receiver) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    // 3️⃣ Verify PIN
    if (!sender.pin) {
      return res.status(400).json({ message: "PIN not set" });
    }

    const pinMatch = await bcrypt.compare(pin.toString(), sender.pin);
    if (!pinMatch) {
      return res.status(401).json({ message: "Invalid PIN" });
    }

    // 4️⃣ Check balance
    if (sender.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // 5️⃣ Perform transfer
    sender.balance -= amount;
    receiver.balance += amount;

    await sender.save();
    await receiver.save();

    // 6️⃣ Record transaction
    await Transaction.create({
      phone: from,
      amount,
      type: "SEND",
      meta: {
        to,
      },
    });

    return res.json({
      success: true,
      message: "Transfer successful",
    });

  } catch (err) {
    console.error("SEND MONEY ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = sendMoney;
