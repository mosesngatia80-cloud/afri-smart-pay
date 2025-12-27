const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(express.json());

// 🔥 GLOBAL REQUEST LOGGER (THIS IS THE KEY)
app.use((req, res, next) => {
  console.log("🔥🔥 INCOMING REQUEST:", req.method, req.path);
  next();
});

// =======================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err.message));

// =======================
const walletSchema = new mongoose.Schema({
  phone: { type: String, unique: true },
  balance: { type: Number, default: 0 }
});
const transactionSchema = new mongoose.Schema({
  transId: { type: String, unique: true }
});
const Wallet = mongoose.model("Wallet", walletSchema);
const Transaction = mongoose.model("Transaction", transactionSchema);

// =======================
app.post("/api/c2b/confirmation", async (req, res) => {
  console.log("🔥🔥🔥 CONFIRMATION HIT 🔥🔥🔥");
  console.log(req.body);
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

app.post("/api/c2b/validation", (req, res) => {
  console.log("🔥🔥🔥 VALIDATION HIT 🔥🔥🔥");
  console.log(req.body);
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 SERVER RUNNING ON", PORT);
});
