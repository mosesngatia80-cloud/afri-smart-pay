import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

/* =========================
   MIDDLEWARE
========================= */
app.use(cors());
app.use(express.json());

/* =========================
   DATABASE
========================= */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB error:", err.message);
    process.exit(1);
  });

/* =========================
   C2B CALLBACK ROUTES
   (DARJA COMPLIANT – NO 'mpesa')
========================= */

// VALIDATION
app.post("/api/c2b/validation", (req, res) => {
  console.log("📥 C2B VALIDATION RECEIVED");
  console.log(JSON.stringify(req.body, null, 2));

  return res.json({
    ResultCode: 0,
    ResultDesc: "Accepted"
  });
});

// CONFIRMATION
app.post("/api/c2b/confirmation", (req, res) => {
  console.log("📥 C2B CONFIRMATION RECEIVED");
  console.log(JSON.stringify(req.body, null, 2));

  // TODO: save transaction, credit wallet, link to Smart Biz order

  return res.json({
    ResultCode: 0,
    ResultDesc: "Accepted"
  });
});

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.send("Afri Smart Pay API is running");
});

/* =========================
   SERVER START
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Afri Smart Pay running on port ${PORT}`);
});
