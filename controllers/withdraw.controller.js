import Wallet from "../models/Wallet.js";
import Transaction from "../models/Transaction.js";
import bcrypt from "bcryptjs";

const WITHDRAW_FEE = 15;
const MIN_WITHDRAW = 50;

export const withdraw = async (req, res) => {
  try {
    const { phone, amount, pin } = req.body;

    if (!phone || !amount || !pin) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (Number(amount) < MIN_WITHDRAW) {
      return res.status(400).json({
        message: `Minimum withdrawal is KES ${MIN_WITHDRAW}`
      });
    }

    const wallet = await Wallet.findOne({ phone });
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    const pinMatch = await bcrypt.compare(pin, wallet.pin);
    if (!pinMatch) {
      return res.status(401).json({ message: "Invalid PIN" });
    }

    const totalDebit = Number(amount) + WITHDRAW_FEE;

    if (wallet.balance < totalDebit) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // Debit wallet
    wallet.balance -= totalDebit;
    await wallet.save();

    // Withdrawal transaction
    await Transaction.create({
      wallet: wallet._id,
      type: "WITHDRAWAL",
      amount: Number(amount),
      reference: `WD_${Date.now()}`,
      phone,
      status: "SUCCESS"
    });

    // Fee transaction
    await Transaction.create({
      wallet: wallet._id,
      type: "FEE",
      amount: WITHDRAW_FEE,
      reference: `FEE_WD_${Date.now()}`,
      status: "SUCCESS"
    });

    // 🔄 Simulated M-PESA payout
    console.log(`📤 Simulated M-PESA payout: ${amount} to ${phone}`);

    return res.json({
      message: "Withdrawal successful",
      withdrawn: amount,
      fee: WITHDRAW_FEE,
      totalDebited: totalDebit
    });

  } catch (error) {
    console.error("❌ WITHDRAW ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
