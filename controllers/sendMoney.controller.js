import Wallet from "../models/Wallet.js";
import Transaction from "../models/Transaction.js";
import bcrypt from "bcryptjs";

const SEND_MONEY_FEE = 10; // KES

export const sendMoney = async (req, res) => {
  try {
    const { fromPhone, toPhone, amount, pin } = req.body;

    if (!fromPhone || !toPhone || !amount || !pin) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const sender = await Wallet.findOne({ phone: fromPhone });
    const receiver = await Wallet.findOne({ phone: toPhone });

    if (!sender || !receiver) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    // 🔐 Verify PIN
    const pinMatch = await bcrypt.compare(pin, sender.pin);
    if (!pinMatch) {
      return res.status(401).json({ message: "Invalid PIN" });
    }

    const totalDebit = Number(amount) + SEND_MONEY_FEE;

    if (sender.balance < totalDebit) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // 💸 Move money
    sender.balance -= totalDebit;
    receiver.balance += Number(amount);

    await sender.save();
    await receiver.save();

    // 🧾 Transaction: Send money
    await Transaction.create({
      wallet: sender._id,
      type: "SEND_MONEY",
      amount: Number(amount),
      reference: `SEND_${Date.now()}`,
      phone: toPhone,
      status: "SUCCESS"
    });

    // 💰 Transaction: Fee
    await Transaction.create({
      wallet: sender._id,
      type: "FEE",
      amount: SEND_MONEY_FEE,
      reference: `FEE_${Date.now()}`,
      status: "SUCCESS"
    });

    return res.json({
      message: "Transfer successful",
      sent: amount,
      fee: SEND_MONEY_FEE,
      totalDebited: totalDebit
    });

  } catch (error) {
    console.error("❌ SEND MONEY ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
