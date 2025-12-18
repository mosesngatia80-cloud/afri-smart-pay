const express = require("express");
const { createPayment } = require("../controllers/paypal.controller.cjs");

const router = express.Router();

router.post("/create-payment", createPayment);

module.exports = router;
