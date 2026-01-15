const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

/* ================= APP ================= */
const app = express();
app.use(express.json());

/* ================= DATABASE ================= */
mongoose
  .connect(process.env.MONGO_URI, { family: 4 })
  .then(() => console.log("✅ Smart Pay DB connected"))
  .catch(err => {
    console.error("DB error:", err.message);
    process.exit(1);
  });

/* ================= HEALTH ================= */
app.get("/api/health", (req, res) => {
  res.json({ status: "SMART_PAY_OK" });
});

/* ================= ROUTES ================= */
const paymentsRoutes = require("./routes/payments.routes");
app.use("/api/payments", paymentsRoutes);

/* ================= START ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Smart Pay running on ${PORT}`);
});
