const LedgerEntry = require("../models/LedgerEntry");

/**
 * =========================
 * GET LEDGER (LIST)
 * =========================
 * Query params:
 *  - owner
 *  - type
 *  - reference
 *  - limit (default 50)
 */
async function getLedger(req, res) {
  try {
    const { owner, type, reference, limit = 50 } = req.query;

    const filter = {};
    if (owner) filter.owner = owner;
    if (type) filter.type = type;
    if (reference) filter.reference = reference;

    const entries = await LedgerEntry.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json({
      success: true,
      count: entries.length,
      entries
    });
  } catch (err) {
    console.error("GET LEDGER ERROR:", err);
    res.status(500).json({ message: "Failed to fetch ledger" });
  }
}

/**
 * =========================
 * GET LEDGER BY REFERENCE
 * =========================
 */
async function getLedgerByReference(req, res) {
  try {
    const { reference } = req.params;

    const entries = await LedgerEntry.find({ reference }).sort({
      createdAt: 1
    });

    res.json({
      success: true,
      reference,
      entries
    });
  } catch (err) {
    console.error("GET LEDGER REF ERROR:", err);
    res.status(500).json({ message: "Failed to fetch ledger" });
  }
}

module.exports = {
  getLedger,
  getLedgerByReference
};
