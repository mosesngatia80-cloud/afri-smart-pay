const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    source: {
      type: String,
      default: "MPESA",
    },
    reference: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
