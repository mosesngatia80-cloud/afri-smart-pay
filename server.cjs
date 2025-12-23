import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();

/* ===============================
   MIDDLEWARE
================================ */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ===============================
   HEALTH CHECK
================================ */
app.get("/", (req, res) => {
  res.send("Afri Smart Pay API is running 🚀");
});

/* ===============================
   M-PESA C2B CALLBACK ROUTES
   (THIS IS WHAT SAFARICOM NEEDS)
================================ */

// VALIDATION URL
app.post("/api/mpesa/validation", (req, res) => {
  console.log("🔔 M-PESA VALIDATION CALLBACK RECEIVED");
  console.log(JSON.stringify(req.body, null, 2));

  return res.json({
    ResultCode: 0,
    ResultDesc: "Accepted"
  });
});

// CONFIRMATION URL
app.post("/api/mpesa/confirmation", (req, res) => {
  console.log("✅ M-PESA CONFIRMATION CALLBACK RECEIVED");
  console.log(JSON.stringify(req.body, null, 2));

  return res.json({
    ResultCode: 0,
    ResultDesc: "Success"
  });
});

// OPTIONAL: Allow GET for browser/manual testing
app.get("/api/mpesa/validation", (req, res) => {
  res.json({ status: "validation endpoint live" });
});

app.get("/api/mpesa/confirmation", (req, res) => {
  res.json({ status: "confirmation endpoint live" });
});

/* ===============================
   START SERVER
================================ */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Afri Smart Pay running on port ${PORT}`);
});
