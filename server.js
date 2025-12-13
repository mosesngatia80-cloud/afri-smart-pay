import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";

import paypalRoutes from "./routes/paypal.routes.js";
import paypalTopupRoutes from "./routes/topup.paypal.routes.js";

dotenv.config();

const app = express();

// =============================
// MIDDLEWARE
// =============================
app.use(cors());
app.use(bodyParser.json());

// =============================
// MONGODB CONNECTION
// =============================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err.message));

// =============================
// ROUTES
// =============================

// OLD PAYPAL ROUTES (KEEP)
app.use("/api/paypal", paypalRoutes);

// NEW CLEAN TOP-UP ROUTES
app.use("/api/topup/paypal", paypalTopupRoutes);

// HEALTH CHECK
app.get("/", (req, res) => {
  res.json({ status: "Afri Smart Pay API running" });
});

// =============================
// SERVER START
// =============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Afri Smart Pay API running on port ${PORT}`);
});
