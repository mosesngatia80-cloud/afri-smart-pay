const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const API_V1 = "/api/v1";

/* =========================
   HEALTH
========================= */
app.get("/api/health", (req, res) => {
  res.json({ status: "Smart Pay running", version: "v1.0.0" });
});

/* =========================
   MONGO
========================= */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(() => process.exit(1));

/* =========================
   WALLET MODEL
========================= */
const Wallet = mongoose.model("Wallet", new mongoose.Schema({
  owner: { type: String, unique: true },
  type: { type: String, default: "USER" },
  balance: { type: Number, default: 0 }
}, { timestamps: true }));

/* =========================
   WALLET ROUTES (v1)
========================= */
app.post(`${API_V1}/wallet/create`, async (req, res) => {
  const { owner, type = "USER" } = req.body;
  let wallet = await Wallet.findOne({ owner });
  if (!wallet) wallet = await Wallet.create({ owner, type });
  res.json({ wallet });
});

app.get(`${API_V1}/wallet/:owner`, async (req, res) => {
  const wallet = await Wallet.findOne({ owner: req.params.owner });
  if (!wallet) return res.status(404).json({ message: "Wallet not found" });
  res.json(wallet);
});

/* =========================
   🔔 C2B VALIDATION
========================= */
app.post("/api/c2b/validation", (req, res) => {
  console.log("🔔 C2B VALIDATION RECEIVED");
  console.log(JSON.stringify(req.body, null, 2));

  // Always ACCEPT payment
  res.json({
    ResultCode: 0,
    ResultDesc: "Accepted"
  });
});

/* =========================
   🔔 C2B CONFIRMATION
========================= */
app.post("/api/c2b/confirmation", async (req, res) => {
  console.log("💰 C2B CONFIRMATION RECEIVED");
  console.log(JSON.stringify(req.body, null, 2));

  // v1: just acknowledge
  res.json({
    ResultCode: 0,
    ResultDesc: "Received"
  });
});

/* =========================
   START
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Smart Pay running on ${PORT}`);
});
