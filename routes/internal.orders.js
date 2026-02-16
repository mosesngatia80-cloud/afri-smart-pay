const express = require("express");
const router = express.Router();
const Order = require("../models/Order");

/**
 * 🔐 INTERNAL AUTH (SMART PAY → SMART BIZ)
 * Uses INTERNAL_KEY (server-to-server)
 */
function internalAuth(req, res, next) {
  const key = req.headers["x-internal-key"];
  if (!key || key !== process.env.CT_INTERNAL_KEY) {
    return res.status(401).json({ message: "Unauthorized internal call" });
  }
  next();
}

/**
 * ✅ MARK ORDER AS PAID (INTERNAL)
 * Called ONLY by Smart Pay
 */
router.post("/orders/mark-paid", internalAuth, async (req, res) => {
  try {
    const { orderId, paymentRef } = req.body;

    if (!orderId || !paymentRef) {
      return res.status(400).json({ message: "orderId and paymentRef required" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status === "paid") {
      return res.json({ success: true });
    }

    order.status = "paid";
    order.paymentRef = paymentRef;
    order.paidAt = new Date();
    await order.save();

    console.log("✅ ORDER AUTO-MARKED PAID:", order._id.toString());

    res.json({ success: true });
  } catch (err) {
    console.error("❌ INTERNAL ORDER MARK ERROR:", err.message);
    res.status(500).json({ message: "Internal order update failed" });
  }
});

module.exports = router;
