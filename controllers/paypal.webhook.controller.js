const handlePayPalWebhook = (req, res) => {
  console.log("🔔 PayPal Webhook Event:", req.body);

  // Acknowledge PayPal immediately
  return res.status(200).json({ received: true });
};

module.exports = {
  handlePayPalWebhook
};
