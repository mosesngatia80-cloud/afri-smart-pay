const express = require("express");
const router = express.Router();
const {
  createPaypalOrder,
  capturePaypalOrder
} = require("../controllers/paypal.controller");

// Create PayPal order
router.post("/create-payment", createPaypalOrder);

// Capture PayPal order
router.post("/capture-payment", capturePaypalOrder);

module.exports = router;
