require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

/* =========================
   MIDDLEWARE
========================= */
app.use(cors());
app.use(express.json());

/* =========================
   DATABASE
========================= */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB error:", err.message);
    process.exit(1);
  });

/* =========================
   ROUTES IMPORT
========================= */
const walletRoutes = require("./routes/wallet.routes");
const sendMoneyRoutes = require("./routes/sendMoney.routes");
const checkBalanceRoutes = require("./routes/checkBalance.routes");
const transactionsRoutes = require("./routes/transactions.routes");

/* =========================
   API ROUTES
========================= */
app.use("/api", walletRoutes);
app.use("/api", sendMoneyRoutes);
app.use("/api", checkBalanceRoutes);
app.use("/api", transactionsRoutes);

console.log("🔥 API routes mounted: wallet, send-money, balance, transactions");

/* =========================
   C2B CALLBACK ROUTES
========================= */
app.post("/api/c2b/validation", (req, res) => {
  console.log("📥 C2B VALIDATION RECEIVED");
  console.log(JSON.stringify(req.body, null, 2));
  return res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

app.post("/api/c2b/confirmation", (req, res) => {
  console.log("📥 C2B CONFIRMATION RECEIVED");
  console.log(JSON.stringify(req.body, null, 2));
  return res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.send("Afri Smart Pay API is running");
});

/* =========================
   SERVER START
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Afri Smart Pay running on port ${PORT}`);
});
