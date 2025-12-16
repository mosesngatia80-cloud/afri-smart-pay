const express = require("express");
const {
  mpesaValidation,
  mpesaConfirmation
} = require("../controllers/mpesa.controller.js");

const router = express.Router();

// Daraja C2B callbacks (NO "mpesa" in URL)
router.post("/validation", mpesaValidation);
router.post("/confirmation", mpesaConfirmation);

module.exports = router;
