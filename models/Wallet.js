const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    balance: {
      type: Number,
      default: 0,
    },
    pin: {
      type: String,
      select: false, // hide by default
    },
    transactions: {
      type: Array,
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Wallet", walletSchema);
