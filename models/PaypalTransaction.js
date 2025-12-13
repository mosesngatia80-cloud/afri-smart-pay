import mongoose from "mongoose";

const paypalTransactionSchema = new mongoose.Schema({
  phone: String,
  orderId: String,
  captureId: String,
  amount: Number,
  currency: String,
  status: String,
  payerEmail: String,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("PaypalTransaction", paypalTransactionSchema);
