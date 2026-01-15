const mongoose = require("mongoose");

const WalletSchema = new mongoose.Schema({
  owner: { type: String, required: true, index: true },
  balance: { type: Number, default: 0 },
  pinHash: { type: String, default: "" },
  walletType: {
    type: String,
    enum: ["USER", "BUSINESS"],
    default: "USER"
  }
});

module.exports =
  mongoose.models.Wallet ||
  mongoose.model("Wallet", WalletSchema);
