const express = require("express");
const {
  withdraw,
  withdrawPreview
} = require("../controllers/withdraw.controller");

const {
  getLedger,
  getLedgerByReference
} = require("../controllers/ledger.controller");

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
