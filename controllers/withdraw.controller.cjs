const Wallet = require("../models/Wallet");
const { writeLedger } = require("../utils/ledger");
const { calculateWithdrawFee } = require("../utils/fees");
const { checkWithdrawLimits } = require("../utils/limits");
const bcrypt = require("bcryptjs");

/* =========================
   PREVIEW WITHDRAW
========================= */
exports.withdrawPreview = async (req, res) => {
  try {
    const { phone, amount } = req.body;

    if (!phone || !amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid request" });
    }

    const wallet = await Wallet.findOne({ phone });
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    const fee = calculateWithdrawFee(amount);
    const allowed = checkWithdrawLimits(wallet, amount);

    if (!allowed) {
      return res.status(403).json({ message: "Withdrawal limit exceeded" });
    }

    if (wallet.balance < amount + fee) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    res.json({
      amount,
      fee,
      netAmount: amount - fee,
      balance: wallet.balance,
      allowed: true
    });
  } catch (err) {
    console.error("Withdraw preview error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   EXECUTE WITHDRAW
========================= */
exports.withdraw = async (req, res) => {
  try {
    const { phone, amount, pin } = req.body;

    if (!phone || !amount || !pin) {
      return res.status(400).json({ message: "Invalid request" });
    }

    const wallet = await Wallet.findOne({ phone }).select("+pinHash");
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    const pinValid = await bcrypt.compare(pin, wallet.pinHash);
    if (!pinValid) {
      return res.status(403).json({ message: "Invalid PIN" });
    }

    const fee = calculateWithdrawFee(amount);
    const total = amount + fee;

    if (wallet.balance < total) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    wallet.balance -= total;
    await wallet.save();

    await writeLedger({
      phone,
      type: "WITHDRAW",
      amount,
      fee,
      balanceAfter: wallet.balance
    });

    res.json({
      message: "Withdrawal successful",
      amount,
      fee,
      balance: wallet.balance
    });
  } catch (err) {
    console.error("Withdraw error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
