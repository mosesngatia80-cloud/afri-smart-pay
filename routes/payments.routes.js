const express = require("express");

/* =========================
   WITHDRAW CONTROLLER (CJS)
========================= */
const withdrawController = require("../controllers/withdraw.controller.cjs");

console.log("WITHDRAW CONTROLLER EXPORTS:", Object.keys(withdrawController));

const { withdraw, withdrawPreview } = withdrawController;

if (typeof withdraw !== "function" || typeof withdrawPreview !== "function") {
  throw new Error("❌ Withdraw controllers are undefined at runtime");
}

/* =========================
   LEDGER CONTROLLER
========================= */
const {
  getLedger,
  getLedgerByReference
} = require("../controllers/ledger.controller.js");

/* =========================
   M-PESA STK PUSH CONTROLLER
========================= */
const {
  stkPush
} = require("../controllers/mpesa.stk.controller");

/* =========================
   ROUTER
========================= */
const router = express.Router();

/* =========================
   STK PUSH (C2B – PAY IN)
========================= */
router.post("/stk-push", stkPush);

/* =========================
   WITHDRAWALS (B2C – PAY OUT)
========================= */
router.post("/withdraw/preview", withdrawPreview);
router.post("/withdraw", withdraw);

/* =========================
   LEDGER (READ ONLY)
========================= */
router.get("/ledger", getLedger);
router.get("/ledger/:reference", getLedgerByReference);

module.exports = router;
