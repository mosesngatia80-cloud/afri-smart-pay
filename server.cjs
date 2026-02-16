const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

/* ================= APP ================= */
const app = express();

// Required for JSON + M-PESA callbacks
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ================= HEALTH ================= */
app.get("/api/health", (req, res) => {
  res.json({ status: "SMART_PAY_OK" });
});

/* 🔽 ADDED (ALIAS ONLY — NO EXISTING CODE TOUCHED) */
app.get("/health", (req, res) => {
  res.json({ status: "SMART_PAY_OK" });
});
/* 🔼 END ADD */

/* ================= RAW C2B VISIBILITY (NO LOGIC) ================= */
app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/api/c2b")) {
    console.log("🔥 INCOMING C2B REQUEST");
    console.log("METHOD:", req.method);
    console.log("URL:", req.originalUrl);
    console.log("HEADERS:", JSON.stringify(req.headers, null, 2));
    console.log("BODY:", JSON.stringify(req.body, null, 2));
  }
  next();
});

/* ================= ROUTES ================= */
const paymentsRoutes = require("./routes/payments.routes");
const walletRoutes   = require("./routes/wallet.routes");
const mpesaRoutes    = require("./routes/mpesa.routes");
const c2bRoutes      = require("./routes/c2b.routes");

/* ================= MOUNT ================= */

// Payments (withdrawals, ledger)
app.use("/api/payments", paymentsRoutes);

// Wallet logic
app.use("/api/wallet", walletRoutes);

// MPESA: STK Push + callbacks
app.use("/api/mpesa", mpesaRoutes);

// MPESA C2B: Validation + Confirmation
app.use("/api/c2b", c2bRoutes);

console.log("✅ MPESA routes mounted at /api/mpesa");
console.log("✅ C2B routes mounted at /api/c2b");

/* ================= 404 ================= */
app.use((req, res) => {
  res.status(404).json({
    error: "ENDPOINT_NOT_FOUND",
    path: req.originalUrl
  });
});

/* ================= START SERVER FIRST (RENDER SAFE) ================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(\`🚀 Smart Pay running on port \${PORT}\`);
});

/* ================= DATABASE (NON-BLOCKING) ================= */
console.log("🟡 Connecting to MongoDB...");

mongoose
  .connect(process.env.MONGO_URI, {
    family: 4,
    serverSelectionTimeoutMS: 10000
  })
  .then(() => {
    console.log("✅ Smart Pay DB connected");
  })
  .catch(err => {
    console.error("❌ DB error:", err.message);
  });
