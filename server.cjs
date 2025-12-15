const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();

const app = express();

/* ---------------- MIDDLEWARE ---------------- */
app.use(cors());
app.use(bodyParser.json());

/* ---------------- BASIC HEALTH CHECK ---------------- */
app.get("/", (req, res) => {
  res.send("🚀 Afri Smart Pay API is running");
});

/* ---------------- MONGODB CONNECTION ---------------- */
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI not set");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

/* ---------------- SIMPLE WALLET SCHEMA ---------------- */
/* (Temporary – proves routing works. You can replace with your full model later) */
const walletSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },
});

const Wallet = mongoose.models.Wallet || mongoose.model("Wallet", walletSchema);

/* ---------------- ROUTES ---------------- */

/**
 * POST /api/check-balance
 * body: { phone: "2547XXXXXXXX" }
 */
app.post("/api/check-balance", async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    let wallet = await Wallet.findOne({ phone });

    if (!wallet) {
      wallet = await Wallet.create({ phone, balance: 0 });
    }

    return res.json({
      success: true,
      phone: wallet.phone,
      balance: wallet.balance,
    });
  } catch (error) {
    console.error("❌ Check balance error:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ---------------- START SERVER ---------------- */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🔥 Afri Smart Pay API running on port ${PORT}`);
});
