const bcrypt = require("bcryptjs");
const Wallet = require("../models/Wallet");
const { writeLedger } = require("../utils/ledger");
const { calculateWithdrawFee } = require("../utils/fees");
const {
  MAX_WITHDRAW_PER_TX,
  MAX_WITHDRAW_PER_DAY,
  getTodayWithdrawTotal
} = require("../utils/limits");
const sendB2C = require("../utils/mpesaB2C.cjs");

/**
 * =========================
 * WITHDRAW FUNDS
 * =========================
 */
async function withdraw(req, res) {
  try {
    const { phone, amount, pin } = req.body;

    if (!phone || !amount || !pin) {
      return res.status(400).json({ message: "Missing fields" });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    if (amount > MAX_WITHDRAW_PER_TX) {
      return res.status(400).json({
        message: "Per-transaction limit exceeded",
        limit: MAX_WITHDRAW_PER_TX
      });
    }

    const todayTotal = await getTodayWithdrawTotal(phone);
    if (todayTotal + amount > MAX_WITHDRAW_PER_DAY) {
      return res.status(400).json({
        message: "Daily withdrawal limit exceeded",
        usedToday: todayTotal,
        limit: MAX_WITHDRAW_PER_DAY
      });
    }

    const wallet = await Wallet.findOne({ owner: phone });
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    const pinOk = await bcrypt.compare(pin, wallet.pinHash);
    if (!pinOk) {
      return res.status(401).json({ message: "Invalid PIN" });
    }

    // ✅ EXISTING FEE LOGIC (UNCHANGED)
    const fee = calculateWithdrawFee(amount, wallet.walletType);
    const totalDebit = amount + fee;

    if (wallet.balance < totalDebit) {
      return res.status(400).json({
        message: "Insufficient balance",
        required: totalDebit,
        balance: wallet.balance
      });
    }

    // ======================
    // WALLET DEBIT
    // ======================
    const before = wallet.balance;
    wallet.balance -= totalDebit;
    await wallet.save();

    const reference =
      "WD_" + Math.random().toString(16).slice(2, 10).toUpperCase();

    // ======================
    // LEDGER (NOW ASYNC-SAFE)
    // ======================
    await writeLedger({
      owner: phone,
      type: "WITHDRAW",
      amount,
      reference,
      balanceBefore: before,
      balanceAfter: before - amount,
      status: "QUEUED"
    });

    if (fee > 0) {
      await writeLedger({
        owner: phone,
        type: "FEE",
        amount: fee,
        reference: reference + "_FEE",
        balanceBefore: before - amount,
        balanceAfter: wallet.balance,
        status: "QUEUED"
      });
    }

    // ======================
    // SEND M-PESA B2C
    // ======================
    await sendB2C({
      phone,
      amount,
      remarks: "Smart Pay Withdrawal",
      occasion: "SMARTPAY_WITHDRAW",
      reference
    });

    res.json({
      success: true,
      message: "Withdrawal queued",
      amount,
      fee,
      totalDebited: totalDebit,
      reference
    });
  } catch (e) {
    console.error("WITHDRAW ERROR:", e);
    res.status(500).json({ message: "Withdrawal failed" });
  }
}

/* ================= WITHDRAW PREVIEW ================= */
async function withdrawPreview(req, res) {
  try {
    const { phone, amount } = req.body;

    if (!phone || !amount || amount <= 0) {
      return res.status(400).json({ message: "phone and valid amount required" });
    }

    const wallet = await Wallet.findOne({ owner: phone });
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    const fee = calculateWithdrawFee(amount, wallet.walletType);
    const totalDebited = amount + fee;

    if (wallet.balance < totalDebited) {
      return res.status(400).json({
        message: "Insufficient balance",
        required: totalDebited,
        balance: wallet.balance
      });
    }

    res.json({
      success: true,
      amount,
      fee,
      totalDebited,
      netPayout: amount,
      balance: wallet.balance,
      walletType: wallet.walletType
    });
  } catch (e) {
    console.error("WITHDRAW PREVIEW ERROR:", e);
    res.status(500).json({ message: "Preview failed" });
  }
}

module.exports = {
  withdraw,
  withdrawPreview
};
