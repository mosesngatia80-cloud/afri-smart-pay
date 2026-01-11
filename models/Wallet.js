const mongoose = require("mongoose");

const WalletSchema = new mongoose.Schema(
  {
    owner: {
      type: String,
      required: true,
      unique: true
    },

    type: {
      type: String,
      enum: ["USER", "BUSINESS"],
      default: "USER"
    },

    balance: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Wallet", WalletSchema);
