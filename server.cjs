const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

/* ================= APP ================= */
const app = express();

// Required for JSON + M-PESA callbacks
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ================= DATABASE ================= */
mongoose
  .connect(process.env.MONGO_URI, { family: 4 })
  .then(() => console.log("✅ Smart Pay DB connected"))
  .catch(err => {
    console.error("❌ DB error:", err.message);
    process.exit(1);
  });

/* ================= HEALTH ================= */
app.get("/api/health", (req, res) => {
  res.json({ status: "SMART_PAY_OK" });
});

/* ================= ROUTES ================= */
const paymentsRoutes = require("./routes/payments.routes");
const walletRoutes   = require("./routes/wallet.routes");
const mpesaRoutes    = require("./routes/mpesa.routes");

/* ================= MOUNT ================= */

// Payments (withdrawals, ledger)
app.use("/api/payments", paymentsRoutes);

// Wallet logic
app.use("/api/wallet", walletRoutes);

// MPESA: STK Push + callbacks
app.use("/api/mpesa", mpesaRoutes);

// Debug log (important)
console.log("✅ MPESA routes mounted at /api/mpesa");

/* ================= 404 ================= */
app.use((req, res) => {
  res.status(404).json({
    error: "ENDPOINT_NOT_FOUND",
    path: req.originalUrl
  });
});

/* ================= START ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Smart Pay running on port ${PORT}`);
});
