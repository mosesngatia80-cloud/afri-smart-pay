const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const { writeLedger } = require("../utils/ledger");

/**
 * =========================
 * M-PESA B2C CALLBACK
 * =========================
 */
async function b2cCallback(req, res) {
  try {
    const callback = req.body;

    const result =
      callback?.Result ||
      callback?.result ||
      callback;

    const resultCode = result?.ResultCode;
    const resultDesc = result?.ResultDesc;
    const reference = result?.OriginatorConversationID;

    if (!reference) {
      console.error("B2C CALLBACK: Missing reference");
      return res.json({ ResultCode: 0, ResultDesc: "Ignored" });
    }

    const tx = await Transaction.findOne({ reference });

    if (!tx) {
      console.error("B2C CALLBACK: Transaction not found", reference);
      return res.json({ ResultCode: 0, ResultDesc: "Ignored" });
    }

    // ======================
    // SUCCESS
    // ======================
    if (resultCode === 0 || resultCode === "0") {
      tx.status = "SUCCESS";
      tx.mpesaResultDesc = resultDesc;
      await tx.save();

      await writeLedger({
        owner: tx.owner,
        type: "WITHDRAW_COMPLETE",
        amount: tx.amount,
        reference: reference + "_COMPLETE",
        status: "SUCCESS"
      });

      return res.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    // ======================
    // FAILURE → REVERSE
    // ======================
    const wallet = await Wallet.findOne({ owner: tx.owner });
    if (!wallet) {
      console.error("B2C CALLBACK: Wallet missing for reversal");
      return res.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const refundAmount = tx.amount + (tx.fee || 0);
    const before = wallet.balance;

    wallet.balance += refundAmount;
    await wallet.save();

    await writeLedger({
      owner: tx.owner,
      type: "REVERSAL",
      amount: refundAmount,
      reference: reference + "_REVERSAL",
      balanceBefore: before,
      balanceAfter: wallet.balance,
      status: "SUCCESS"
    });

    tx.status = "FAILED";
    tx.mpesaResultDesc = resultDesc;
    await tx.save();

    return res.json({ ResultCode: 0, ResultDesc: "Reversed" });

  } catch (err) {
    console.error("B2C CALLBACK ERROR:", err);
    return res.json({ ResultCode: 0, ResultDesc: "Error handled" });
  }
}

module.exports = { b2cCallback };
