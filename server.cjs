const express = require("express");
const cors = require("cors");

const app = express();

/* =======================
   MIDDLEWARE
======================= */
app.use(cors());
app.use(express.json());

/* =======================
   HEALTH CHECK
======================= */
app.get("/", (req, res) => {
  res.status(200).send("Afri Smart Pay API is running");
});

/* =======================
   M-PESA CALLBACKS
======================= */

// VALIDATION URL
app.post("/api/mpesa/validation", (req, res) => {
  console.log("🔔 M-PESA VALIDATION CALLBACK");
  console.log(JSON.stringify(req.body, null, 2));

  return res.json({
    ResultCode: 0,
    ResultDesc: "Accepted"
  });
});

// CONFIRMATION URL
app.post("/api/mpesa/confirmation", (req, res) => {
  console.log("🔔 M-PESA CONFIRMATION CALLBACK");
  console.log(JSON.stringify(req.body, null, 2));

  return res.json({
    ResultCode: 0,
    ResultDesc: "Accepted"
  });
});

/* =======================
   FALLBACK
======================= */
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found"
  });
});

/* =======================
   START SERVER
======================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Afri Smart Pay running on port ${PORT}`);
});
