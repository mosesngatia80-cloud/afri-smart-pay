const express = require("express");
const {
  mpesaValidation,
  mpesaConfirmation
} = require("../controllers/mpesa.controller.js");

const { b2cCallback } = require("../controllers/mpesa.callback.controller");

const router = express.Router();

// =========================
// Daraja C2B callbacks
// =========================
router.post("/validation", mpesaValidation);
router.post("/confirmation", mpesaConfirmation);

// =========================
// Daraja B2C callback
// =========================
router.post("/b2c/callback", b2cCallback);

module.exports = router;
