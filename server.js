import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

// Load env
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ================================
// MongoDB
// ================================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err.message));

// ================================
// ROUTES
// ================================
import paypalRoutes from "./routes/paypal.routes.js";
import paypalTopupRoutes from "./routes/topup.paypal.routes.js";
import paypalWebhookRoutes from "./routes/paypal.webhook.routes.js";
import transactionRoutes from "./routes/transactions.routes.js";

// PayPal core routes
app.use("/api/paypal", paypalRoutes);
app.use("/api/paypal", paypalWebhookRoutes);

// PayPal top-up
app.use("/api/topup/paypal", paypalTopupRoutes);

// Wallet / Transactions
app.use("/api/transactions", transactionRoutes);

// ================================
// Health Check
// ================================
app.get("/", (req, res) => {
  res.json({ status: "Afri Smart Pay API running" });
});

// ================================
// Start Server
// ================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Afri Smart Pay API running on port ${PORT}`);
  console.log("🔔 PayPal Webhook listening at /api/paypal/webhook");
});

import mpesaRoutes from "./routes/mpesa.routes.js";
app.use("/api/mpesa", mpesaRoutes);

import sendMoneyRoutes from "./routes/sendMoney.routes.js";
app.use("/api", sendMoneyRoutes);

import checkBalanceRoutes from "./routes/checkBalance.routes.js";
app.use("/api", checkBalanceRoutes);

import walletRoutes from "./routes/wallet.routes.js";
app.use("/api", walletRoutes);

import withdrawRoutes from "./routes/withdraw.routes.js";
app.use("/api", withdrawRoutes);

import whatsappRoutes from "./routes/whatsapp.routes.js";
app.use("/api", whatsappRoutes);
