const express = require("express");
const {
  withdraw,
  withdrawPreview
} = require("../controllers/withdraw.controller");

const router = express.Router();

router.post("/withdraw/preview", withdrawPreview);
router.post("/withdraw", withdraw);

module.exports = router;

// =========================
// Ledger (read-only)
// =========================
const {
  getLedger,
  getLedgerByReference
} = require("../controllers/ledger.controller");

router.get("/ledger", getLedger);
router.get("/ledger/:reference", getLedgerByReference);
