const express = require("express");
const router = express.Router();

/**
 * ===============================
 * MPESA C2B VALIDATION
 * ===============================
 * Safaricom calls this BEFORE accepting payment
 */
router.post("/validation", async (req, res) => {
  console.log("📥 C2B VALIDATION RECEIVED:", JSON.stringify(req.body, null, 2));

  // Always accept payment (MVP mode)
  return res.json({
    ResultCode: 0,
    ResultDesc: "Accepted"
  });
});

/**
 * ===============================
 * MPESA C2B CONFIRMATION
 * ===============================
 * Safaricom calls this AFTER payment is completed
 */
router.post("/confirmation", async (req, res) => {
  console.log("💰 C2B CONFIRMATION RECEIVED:", JSON.stringify(req.body, null, 2));

  /**
   * IMPORTANT:
   * Here is where Smart Pay later:
   * - credits wallet
   * - writes ledger
   * - emits receipt
   */

  return res.json({
    ResultCode: 0,
    ResultDesc: "Success"
  });
});

module.exports = router;
