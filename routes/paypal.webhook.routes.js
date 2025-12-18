const express = require("express");
const { handlePayPalWebhook } = require("../controllers/paypal.webhook.controller");

const router = express.Router();

router.post("/paypal/webhook", handlePayPalWebhook);

module.exports = router;
