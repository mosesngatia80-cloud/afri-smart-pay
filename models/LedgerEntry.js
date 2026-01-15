const mongoose = require("mongoose");

/**
 * LedgerEntry
 * -------------
 * Low-level accounting record.
 * One append-only entry per money movement.
 * Collection: transactions_ledger (EXISTING)
 */

const ledgerEntrySchema = new mongoose.Schema(
  {
    owner: {
      type: String,
      required: true,
      index: true
    },

    type: {
      type: String,
      required: true,
      enum: [
        "WITHDRAW",
        "FEE",
        "TOPUP",
        "TRANSFER",
        "REVERSAL",
        "WITHDRAW_COMPLETE"
      ]
    },

    amount: {
      type: Number,
      required: true
    },

    reference: {
      type: String,
      required: true,
      index: true
    },

    balanceBefore: {
      type: Number
    },

    balanceAfter: {
      type: Number
    },

    status: {
      type: String,
      default: "SUCCESS"
    },

    metadata: {
      type: Object,
      default: {}
    }
  },
  {
    timestamps: true,
    collection: "transactions_ledger" // 🔑 IMPORTANT
  }
);

module.exports = mongoose.model("LedgerEntry", ledgerEntrySchema);
