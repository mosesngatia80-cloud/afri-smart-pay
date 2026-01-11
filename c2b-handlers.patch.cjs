// ================================
// C2B VALIDATION & CONFIRMATION
// UX-SAFE (BillRefNumber mapping)
// ================================

app.post("/api/c2b/validation", (req, res) => {
  // Always accept Buy Goods payments
  return res.json({
    ResultCode: 0,
    ResultDesc: "Accepted"
  });
});

app.post("/api/c2b/confirmation", async (req, res) => {
  try {
    console.log("✅ C2B CONFIRMATION:", req.body);

    const amount = Number(req.body.TransAmount);
    const reference = req.body.BillRefNumber; // 🔑 UX reference
    const transId = req.body.TransID;

    if (!reference || !amount || !transId) {
      console.warn("⚠️ Missing required C2B fields");
      return res.json({ ResultCode: 0, ResultDesc: "Ignored" });
    }

    // 🔒 Idempotency check (no double credit)
    const existingTx = await Transaction.findOne({ reference: transId });
    if (existingTx) {
      console.log("🔁 Duplicate transaction ignored:", transId);
      return res.json({ ResultCode: 0, ResultDesc: "Duplicate" });
    }

    // Find or create wallet using BillRefNumber
    let wallet = await Wallet.findOne({ owner: reference });
    if (!wallet) {
      wallet = await Wallet.create({ owner: reference, balance: 0 });
    }

    // Credit wallet
    wallet.balance += amount;
    await wallet.save();

    // Save transaction record
    await Transaction.create({
      from: "MPESA_C2B",
      to: reference,
      amount,
      reference: transId
    });

    console.log(`💰 Wallet ${reference} credited with ${amount}`);

    return res.json({
      ResultCode: 0,
      ResultDesc: "Success"
    });
  } catch (err) {
    console.error("❌ C2B CONFIRMATION ERROR:", err.message);
    return res.json({ ResultCode: 0, ResultDesc: "Handled" });
  }
});
