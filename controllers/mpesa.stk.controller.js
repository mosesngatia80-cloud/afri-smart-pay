exports.stkPush = async (req, res) => {
  try {
    const { phone, amount, accountReference, transactionDesc } = req.body;

    if (!phone || !amount || !accountReference) {
      return res.status(400).json({
        error: "MISSING_FIELDS"
      });
    }

    // 🔹 MOCK STK PUSH (for now)
    // Real Daraja call comes later
    console.log("📲 STK PUSH REQUEST:", {
      phone,
      amount,
      accountReference,
      transactionDesc
    });

    return res.json({
      status: "STK_PUSH_SENT",
      phone,
      amount,
      reference: accountReference
    });

  } catch (err) {
    console.error("❌ STK PUSH ERROR:", err.message);
    res.status(500).json({ error: "STK_PUSH_FAILED" });
  }
};
