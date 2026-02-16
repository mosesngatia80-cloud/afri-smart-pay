const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

exports.mpesaWalletConfirmation = async (req, res) => {
  try {
    const data = req.body;

    console.log("📩 MPESA WALLET CONFIRMATION:", JSON.stringify(data, null, 2));

    const resultCode = data.ResultCode;
    const amount = Number(data.TransAmount || data.Amount);
    const phone = data.MSISDN;
    const reference =
      data.BillRefNumber ||
      data.AccountReference ||
      data.Reference;

    // 1️⃣ Reject failed transactions
    if (resultCode !== 0) {
      console.log("❌ Payment failed:", data.ResultDesc);
      return res.json({ ResultCode: 0, ResultDesc: "Rejected" });
    }

    if (!reference || !amount) {
      console.log("❌ Missing reference or amount");
      return res.json({ ResultCode: 0, ResultDesc: "Invalid data" });
    }

    // 2️⃣ Find wallet by reference (phone / walletId / business code)
    const wallet = await Wallet.findOne({
      $or: [
        { phone: reference },
        { walletCode: reference },
        { owner: reference }
      ]
    });

    if (!wallet) {
      console.log("❌ Wallet not found:", reference);
      return res.json({ ResultCode: 0, ResultDesc: "Wallet not found" });
    }

    // 3️⃣ Credit wallet
    wallet.balance += amount;
    await wallet.save();

    // 4️⃣ Record transaction
    await Transaction.create({
      wallet: wallet._id,
      type: "CREDIT",
      amount,
      method: "MPESA",
      reference,
      metadata: data,
      status: "SUCCESS"
    });

    console.log(`✅ Wallet credited: ${reference} +KES ${amount}`);

    // 5️⃣ Respond to Safaricom (CRITICAL)
    res.json({
      ResultCode: 0,
      ResultDesc: "Accepted"
    });

  } catch (err) {
    console.error("❌ WALLET CONFIRMATION ERROR:", err.message);
    res.json({ ResultCode: 0, ResultDesc: "Error handled" });
  }
};
