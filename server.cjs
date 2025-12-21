const express = require("express");
require("dotenv").config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

// ===== ROUTES =====
const walletRoutes = require("./routes/wallet.routes");
const sendMoneyRoutes = require("./routes/sendMoney.routes");
const mpesaRoutes = require("./routes/mpesa.routes");
const paypalTopupRoutes = require("./routes/topup.paypal.routes");
const paypalRoutes = require("./routes/paypal.routes");
const paypalWebhookRoutes = require("./routes/paypal.webhook.routes");
const withdrawRoutes = require("./routes/withdraw.routes");

// ===== MOUNT ROUTES =====
app.use("/api/wallet", walletRoutes);
app.use("/api/send-money", sendMoneyRoutes);
app.use("/api/mpesa", mpesaRoutes);
app.use("/api/topup/paypal", paypalTopupRoutes);
app.use("/api/paypal", paypalRoutes);
app.use("/api", paypalWebhookRoutes);
app.use("/api/withdraw", withdrawRoutes);

// ===== HEALTH CHECK =====
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    service: "Afri Smart Pay API",
    version: "v2"
  });
});

// ===== START =====
app.listen(PORT, () => {
  console.log(`🚀 Afri Smart Pay running on port ${PORT}`);
});
