const bcrypt = require("bcryptjs");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const sendB2C = require("../utils/mpesaB2C");

exports.withdraw = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, pin, phone } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    // Verify PIN
    const validPin = await bcrypt.compare(pin, wallet.pinHash);
    if (!validPin) {
      return res.status(401).json({ error: "Invalid PIN" });
    }

    // Check balance
    if (wallet.balance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Deduct balance temporarily
    wallet.balance -= amount;
    await wallet.save();

    // Create pending transaction
    const tx = await Transaction.create({
      userId,
      type: "WITHDRAWAL",
      amount,
      phone,
      status: "PENDING"
    });

    // Call M-PESA B2C
    const mpesaRes = await sendB2C({
      amount,
      phone,
      remarks: "Smart Pay Withdrawal",
      occasion: "SMARTPAY_WITHDRAW",
      transactionId: tx._id
    });

    tx.mpesaConversationId = mpesaRes.ConversationID;
    await tx.save();

    res.json({
      message: "Withdrawal initiated",
      transactionId: tx._id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Withdrawal failed" });
  }
};
