import mongoose from "mongoose";

const walletSchema = new mongoose.Schema({
  phone: { type: String, unique: true },
  balance: { type: Number, default: 0 },
  pin: { type: String },
  transactions: { type: Array, default: [] },
});

export default mongoose.model("Wallet", walletSchema);
