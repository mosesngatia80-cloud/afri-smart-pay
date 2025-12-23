import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

const app = express();

/* ===============================
   BASIC MIDDLEWARE
================================ */
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/* ===============================
   LOG ALL INCOMING REQUESTS
================================ */
app.use((req, res, next) => {
  console.log("➡️ INCOMING:", req.method, req.originalUrl);
  console.log("📦 BODY:", JSON.stringify(req.body, null, 2));
  next();
});

/* ===============================
   M-PESA CALLBACK HANDLERS
================================ */
const validationHandler = (req, res) => {
  console.log("✅ M-PESA VALIDATION RECEIVED");
  return res.json({
    ResultCode: 0,
    ResultDesc: "Accepted"
  });
};

const confirmationHandler = (req, res) => {
  console.log("✅ M-PESA CONFIRMATION RECEIVED");
  return res.json({
    ResultCode: 0,
    ResultDesc: "Accepted"
  });
};

/* ===============================
   ACCEPT ALL COMMON CALLBACK PATHS
================================ */

/* Preferred paths */
app.post("/api/mpesa/validation", validationHandler);
app.post("/api/mpesa/confirmation", confirmationHandler);

/* Compatibility paths (Safaricom variations) */
app.post("/mpesa/validation", validationHandler);
app.post("/mpesa/confirmation", confirmationHandler);
app.post("/validation", validationHandler);
app.post("/confirmation", confirmationHandler);

/* ===============================
   HEALTH CHECK
================================ */
app.get("/", (req, res) => {
  res.send("✅ Afri Smart Pay API is LIVE");
});

/* ===============================
   FALLBACK (LAST)
================================ */
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

/* ===============================
   START SERVER
================================ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Afri Smart Pay running on port ${PORT}`);
});
