const mongoose = require("mongoose");

const WalletSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    balance: {
      type: Number,
      default: 0
    },
    pinHash: {
      type: String,
      default: ""
    },
    walletType: {
      type: String,
      enum: ["USER", "BUSINESS"],
      default: "USER"
    }
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Wallet ||
  mongoose.model("Wallet", WalletSchema);
