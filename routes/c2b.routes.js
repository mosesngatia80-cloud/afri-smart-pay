const express = require("express");
const router = express.Router();

// ===============================
// MPESA C2B VALIDATION
// ===============================
router.post("/validation", (req, res) => {
  console.log("📥 C2B VALIDATION:", JSON.stringify(req.body, null, 2));

  return res.json({
    ResultCode: 0,
    ResultDesc: "Accepted"
  });
});

// ===============================
// MPESA C2B CONFIRMATION
// ===============================
router.post("/confirmation", (req, res) => {
  console.log("💰 C2B CONFIRMATION:", JSON.stringify(req.body, null, 2));

  return res.json({
    ResultCode: 0,
    ResultDesc: "Success"
  });
});

module.exports = router;
