console.log("🔥 SERVER.CJS LOADED AT", new Date().toISOString());

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

/* ALIAS (NO LOGIC CHANGE) */
app.get("/health", (req, res) => {
  res.json({ status: "SMART_PAY_OK" });
});

/* ================= ROUTES ================= */
const paymentsRoutes = require("./routes/payments.routes");
const walletRoutes   = require("./routes/wallet.routes");
const mpesaRoutes    = require("./routes/mpesa.routes");
const c2bRoutes      = require("./routes/c2b.routes");

/* ================= MOUNT ================= */

app.use("/api/payments", paymentsRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/mpesa", mpesaRoutes);
app.use("/api/c2b", c2bRoutes);

console.log("MPESA routes mounted at /api/mpesa");
console.log("C2B routes mounted at /api/c2b");

/* ================= 404 ================= */
app.use((req, res) => {
  res.status(404).json({
    error: "ENDPOINT_NOT_FOUND",
    path: req.originalUrl
  });
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Smart Pay running on port " + PORT);
});

/* ================= DATABASE ================= */
console.log("Connecting to MongoDB...");

mongoose
  .connect(process.env.MONGO_URI, {
    family: 4,
    serverSelectionTimeoutMS: 10000
  })
  .then(() => {
    console.log("Smart Pay DB connected");
  })
  .catch(err => {
    console.error("DB error:", err.message);
  });
