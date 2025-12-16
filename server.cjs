const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

// Load env
dotenv.config();

// Import routes
const mpesaRoutes = require("./routes/mpesa.routes.js");
const checkBalanceRoutes = require("./routes/checkBalance.routes.js");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ✅ Root health check (fixes "Cannot GET /")
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    service: "Afri Smart Pay API",
    version: "v2",
    timestamp: new Date().toISOString()
  });
});

// ✅ M-PESA C2B routes
// Example: /api/c2b/confirmation
app.use("/api/c2b", mpesaRoutes);

// ✅ Wallet / balance routes
// Example: /check-balance/:phone
app.use(checkBalanceRoutes);

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Afri Smart Pay API running on port ${PORT}`);
});
