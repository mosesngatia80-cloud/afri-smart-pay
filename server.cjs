require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());

// ------------------ MongoDB ------------------
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is missing in .env");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB error", err);
    process.exit(1);
  });

// ------------------ Routes ------------------
function mount(path, route) {
  if (typeof route === "function") {
    app.use(path, route);
    console.log(`✅ Mounted ${path}`);
  } else {
    console.log(`⚠️ Skipped ${path} (not a valid router)`);
  }
}

mount("/api", require("./routes/checkBalance.routes"));
mount("/api", require("./routes/wallet.routes"));
mount("/api", require("./routes/sendMoney.routes"));
mount("/api", require("./routes/withdraw.routes"));
mount("/api", require("./routes/transactions.routes"));
mount("/api", require("./routes/mpesa.routes"));
mount("/api", require("./routes/paypal.routes"));
mount("/api", require("./routes/paypal.webhook.routes"));
mount("/api", require("./routes/whatsapp.routes"));

// ------------------ Start Server ------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Afri Smart Pay running on port ${PORT}`);
});
