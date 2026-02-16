const express = require("express");
const router = express.Router();

/*
  ==================================================
  🔥 C2B CALLBACK VISIBILITY MODE (NO LOGIC)
  ==================================================
*/

console.log("🔥🔥🔥 C2B ROUTES FILE LOADED");

/*
  ===========================
  CONFIRMATION ENDPOINT
  ===========================
*/
router.post("/confirmation", (req, res) => {
  console.log("🔥🔥🔥 CONFIRMATION ENDPOINT HIT");
  console.log("HEADERS:", JSON.stringify(req.headers, null, 2));
  console.log("BODY:", JSON.stringify(req.body, null, 2));

  // ACK SAFARICOM IMMEDIATELY
  res.json({
    ResultCode: 0,
    ResultDesc: "OK"
  });
});

/*
  ===========================
  VALIDATION ENDPOINT
  ===========================
*/
router.post("/validation", (req, res) => {
  console.log("🔥🔥🔥 VALIDATION ENDPOINT HIT");
  console.log("HEADERS:", JSON.stringify(req.headers, null, 2));
  console.log("BODY:", JSON.stringify(req.body, null, 2));

  res.json({
    ResultCode: 0,
    ResultDesc: "OK"
  });
});

module.exports = router;
