const express = require("express");
require("dotenv").config();

const app = express();
app.use(express.json());

// ===============================
// ROUTE IMPORTS (MUST EXPORT router)
// ===============================
const walletRoutes = require("./routes/wallet.routes");
const sendMoneyRoutes = require("./routes/sendMoney.routes");
const withdrawRoutes = require("./routes/withdraw.routes");
const mpesaRoutes = require("./routes/mpesa.routes");
const paypalRoutes = require("./routes/paypal.routes");
const paypalWebhookRoutes = require("./routes/paypal.webhook.routes");

// ===============================
// ROUTE MOUNTING
// ===============================
app.use("/api/wallet", walletRoutes);
app.use("/api/send-money", sendMoneyRoutes);
app.use("/api/withdraw", withdrawRoutes);
app.use("/api/mpesa", mpesaRoutes);
app.use("/api/paypal", paypalRoutes);
app.use("/api", paypalWebhookRoutes);

// ===============================
// HEALTH CHECK
// ===============================
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    service: "Afri Smart Pay API",
    version: "v2",
  });
});

// ===============================
// START SERVER
// ===============================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Afri Smart Pay v2 running on port ${PORT}`);
});
