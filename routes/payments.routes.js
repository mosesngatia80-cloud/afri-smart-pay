const express = require("express");

// Force explicit path + assert
const withdrawController = require("../controllers/withdraw.controller.js");

console.log("WITHDRAW CONTROLLER EXPORTS:", Object.keys(withdrawController));

const { withdraw, withdrawPreview } = withdrawController;

if (typeof withdraw !== "function" || typeof withdrawPreview !== "function") {
  throw new Error("❌ Withdraw controllers are undefined at runtime");
}

const {
  getLedger,
  getLedgerByReference
} = require("../controllers/ledger.controller.js");

const router = express.Router();

// =========================
// Withdrawals
// =========================
router.post("/withdraw/preview", withdrawPreview);
router.post("/withdraw", withdraw);

// =========================
// Ledger (read-only)
// =========================
router.get("/ledger", getLedger);
router.get("/ledger/:reference", getLedgerByReference);

module.exports = router;
