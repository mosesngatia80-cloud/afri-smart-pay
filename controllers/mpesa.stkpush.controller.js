/**
 * STK Push Controller (Mock – Day 8)
 * Real Daraja integration comes later
 */

exports.stkPush = async (req, res) => {
  try {
    const {
      phone,
      amount,
      accountReference,
      transactionDesc
    } = req.body;

    if (!phone || !amount || !accountReference) {
      return res.status(400).json({
        error: "MISSING_FIELDS"
      });
    }

    console.log("📲 STK PUSH REQUEST RECEIVED", {
      phone,
      amount,
      accountReference,
      transactionDesc
    });

    // 🔹 MOCK RESPONSE (no axios, no Daraja yet)
    return res.json({
      status: "STK_PUSH_ACCEPTED",
      phone,
      amount,
      reference: accountReference,
      message: "Awaiting user confirmation"
    });

  } catch (err) {
    console.error("❌ STK PUSH ERROR:", err.message);
    res.status(500).json({ error: "STK_PUSH_FAILED" });
  }
};
