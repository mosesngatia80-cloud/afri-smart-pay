const mongoose = require("mongoose");

const MpesaTransactionSchema = new mongoose.Schema(
  {
    mpesaTransId: {
      type: String,
      unique: true,
      required: true,
      index: true
    },
    amount: Number,
    reference: String,
    raw: Object
  },
  { timestamps: true }
);

module.exports = mongoose.model("MpesaTransaction", MpesaTransactionSchema);
