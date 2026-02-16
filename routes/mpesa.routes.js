const express = require("express");

const {
  mpesaValidation
} = require("../controllers/mpesa.controller.js");

const {
  mpesaConfirmation
} = require("../controllers/mpesa.confirmation.controller");

const { stkPush } = require("../controllers/mpesa.stkpush.controller");
const { b2cCallback } = require("../controllers/mpesa.callback.controller");

/* ✅ NEW – WALLET FUNDING CONFIRMATION (ADDED ONLY) */
const {
  mpesaWalletConfirmation
} = require("../controllers/mpesa.wallet.confirmation.controller");

const router = express.Router();

// =========================
// STK PUSH
// =========================
router.post("/stk-push", stkPush);

// =========================
// SAFARICOM CALLBACKS
// =========================
router.post("/validation", mpesaValidation);
router.post("/confirmation", mpesaConfirmation);
router.post("/b2c/callback", b2cCallback);

/* ✅ NEW – WALLET FUNDING CALLBACK */
router.post("/confirmation/wallet", mpesaWalletConfirmation);

module.exports = router;
