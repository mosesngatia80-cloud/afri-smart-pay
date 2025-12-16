const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

// Routes
const mpesaRoutes = require("./routes/mpesa.routes.js");
const checkBalanceRoutes = require("./routes/checkBalance.routes.js");

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({ status: "Afri Smart Pay running" });
});

// Daraja-safe C2B routes (NO 'mpesa' in URL)
app.use("/api/c2b", mpesaRoutes);

// Wallet / balance routes
app.use(checkBalanceRoutes);

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Afri Smart Pay API running on port ${PORT}`);
});
