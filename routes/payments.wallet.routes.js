const express = require("express");
const crypto = require("crypto");

const router = express.Router();

/*
=====================================
 WALLET PAYMENT BRIDGE
 Smart Pay  →  Smart Biz
=====================================
*/

router.post("/wallet", async (req, res) => {
  try {
    console.log("➡️ /api/payments/wallet HIT");
    console.log("📦 Payload:", req.body);

    const { orderId, amount } = req.body;

    if (!orderId || !amount) {
      return res
        .status(400)
        .json({ message: "orderId and amount required" });
    }

    /* ============================
       FEE RULES
       • Flat 0.5% on ALL amounts
    ============================ */

    const FEE_RATE = 0.005; // 0.5%
    let fee = Math.round(amount * FEE_RATE);

    const netAmount = amount - fee;

    const payload = {
      orderId,
      grossAmount: amount,
      fee,
      netAmount,
      status: "SUCCESS",
    };

    const secret = process.env.SMARTPAY_WEBHOOK_SECRET;
    const smartBizUrl = process.env.SMARTBIZ_BASE_URL;

    if (!secret || !smartBizUrl) {
      console.error("❌ Missing webhook env config");
      return res
        .status(500)
        .json({ message: "Server configuration error" });
    }

    const signature = crypto
      .createHmac("sha256", secret)
      .update(JSON.stringify(payload))
      .digest("hex");

    console.log("🔏 Signature:", signature);
    console.log("📡 Calling:", `${smartBizUrl}/api/webhooks/smartpay`);

    const response = await fetch(
      `${smartBizUrl}/api/webhooks/smartpay`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-smartpay-signature": signature,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("❌ Smart Biz webhook failed:", text);
      return res
        .status(500)
        .json({ message: "Failed to notify Smart Biz" });
    }

    const result = await response.json();

    return res.json({
      status: "SUCCESS",
      orderId,
      grossAmount: amount,
      fee,
      netAmount,
      smartBiz: result,
    });

  } catch (err) {
    console.error("🔥 WALLET BRIDGE ERROR 🔥", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
