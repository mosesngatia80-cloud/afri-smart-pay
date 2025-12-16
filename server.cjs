const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

// Load env
dotenv.config();

// Import routes
const mpesaRoutes = require("./routes/mpesa.routes.js");
const checkBalanceRoutes = require("./routes/checkBalance.routes.js");
const transactionsRoutes = require("./routes/transactions.routes.js");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    service: "Afri Smart Pay API",
    version: "v2"
  });
});

// M-PESA C2B routes
app.use("/api/c2b", mpesaRoutes);

// Wallet routes
app.use(checkBalanceRoutes);

// ✅ Transactions routes (THIS WAS MISSING)
app.use(transactionsRoutes);

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Afri Smart Pay API running on port ${PORT}`);
});
