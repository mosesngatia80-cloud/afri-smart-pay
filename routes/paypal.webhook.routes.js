import express from "express";

const router = express.Router();

/**
 * FINAL ENDPOINT:
 * POST /api/paypal/webhook
 */
router.post(
  "/webhook",
  express.json({ type: "*/*" }),
  async (req, res) => {
    try {
      const event = req.body;

      console.log("🔔 PayPal Webhook Event Received");
      console.log("Event type:", event.event_type);

      return res.status(200).json({ received: true });
    } catch (err) {
      console.error("❌ PayPal Webhook Error:", err.message);
      return res.status(500).json({ error: "Webhook failed" });
    }
  }
);

export default router;
