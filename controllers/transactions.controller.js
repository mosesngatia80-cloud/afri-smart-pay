const Transaction = require("../models/Transaction.js");

module.exports = async function getTransactions(req, res) {
  try {
    const { phone } = req.params;

    const transactions = await Transaction
      .find({ phone })
      .sort({ createdAt: -1 });

    return res.json(transactions.map(tx => ({
      amount: tx.amount,
      source: tx.source,
      date: tx.createdAt
    })));
  } catch (error) {
    console.error("❌ Transaction history error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
