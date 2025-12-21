const express = require("express");
require("dotenv").config();

const app = express();
app.use(express.json());

// ===== PORT =====
const PORT = process.env.PORT || 10000;

// ===== ROUTES (IMPORT DEFAULT EXPORTS ONLY) =====
const walletRoutes = require("./routes/wallet.routes");
const sendMoneyRoutes = require("./routes/sendMoney.routes");
const mpesaRoutes = require("./routes/mpesa.routes");
const withdrawRoutes = require("./routes/withdraw.routes");
const paypalRoutes = require("./routes/paypal.routes");
const paypalWebhookRoutes = require("./routes/paypal.webhook.routes");

// ===== HEALTH CHECK =====
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    service: "Afri Smart Pay API",
    version: "v2",
  });
});

// ===== MOUNT ROUTES (VERY IMPORTANT) =====
app.use("/api/wallet", walletRoutes);
app.use("/api/send-money", sendMoneyRoutes);
app.use("/api/mpesa", mpesaRoutes);
app.use("/api/withdraw", withdrawRoutes);
app.use("/api/paypal", paypalRoutes);
app.use("/api", paypalWebhookRoutes);

// ===== 404 HANDLER =====
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`🚀 Afri Smart Pay v2 running on port ${PORT}`);
});
