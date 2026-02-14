const axios = require("axios");
const MpesaTransaction = require("../models/MpesaTransaction");

/* 🔽 ADDED (SMART PAY) — NO EXISTING CODE TOUCHED */
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
/* 🔼 END ADD */

 /**
  * M-PESA C2B CONFIRMATION
  * This is called by Safaricom after user enters PIN
  */
exports.mpesaConfirmation = async (req, res) => {
  try {
    const data = req.body;

    console.log("📩 MPESA CONFIRMATION:", JSON.stringify(data, null, 2));

    const transId = data.TransID;
    const resultCode = data.ResultCode;
    const amount = Number(data.TransAmount || data.Amount);
    const reference =
      data.BillRefNumber ||
      data.AccountReference ||
      data.Reference;

    /* ================================
       🛡 DUPLICATE TRANSACTION GUARD
       ================================ */
    if (transId) {
      const exists = await MpesaTransaction.findOne({
        mpesaTransId: transId
      });

      if (exists) {
        console.log("⚠️ Duplicate transaction ignored:", transId);
        return res.json({
          ResultCode: 0,
          ResultDesc: "Duplicate ignored"
        });
      }
    }

    // 1️⃣ Reject failed transactions
    if (resultCode !== 0) {
      console.log("❌ Payment failed:", data.ResultDesc);
      return res.json({ ResultCode: 0, ResultDesc: "Rejected" });
    }

    // 2️⃣ Determine plan (EXISTING LOGIC — UNTOUCHED)
    let plan = null;
    if (amount === 500) plan = "pro";
    if (amount === 150) plan = "basic";

    if (!plan) {
      console.log("❌ Invalid amount:", amount);
      return res.json({ ResultCode: 0, ResultDesc: "Invalid amount" });
    }

    // 3️⃣ Save M-PESA transaction (LOCK IT)
    if (transId) {
      await MpesaTransaction.create({
        mpesaTransId: transId,
        amount,
        reference,
        raw: data
      });
    }

    /* ================================
       💰 SMART PAY WALLET CREDIT (ADDED)
       ================================ */
    try {
      const wallet = await Wallet.findOne({ phone: reference });

      if (!wallet) {
        console.log("⚠️ Wallet not found for reference:", reference);
      } else {
        wallet.balance += amount;
        await wallet.save();

        await Transaction.create({
          wallet: wallet._id,
          type: "CREDIT",
          amount,
          reference: transId,
          source: "MPESA_C2B"
        });

        console.log(
          `💰 Wallet credited: ${reference} +${amount}`
        );
      }
    } catch (walletErr) {
      console.error("❌ Wallet credit error:", walletErr.message);
    }
    /* ================================
       ✅ END SMART PAY ADDITION
       ================================ */

    // 4️⃣ Call AI-KES backend (EXISTING — UNTOUCHED)
    await axios.post(
      process.env.AI_KES_UPGRADE_URL,
      {
        email: reference,
        plan
      },
      {
        headers: {
          "x-internal-key": process.env.INTERNAL_API_KEY
        }
      }
    );

    console.log(`✅ AI user upgraded: ${reference} → ${plan}`);

    // 5️⃣ Respond to Safaricom (VERY IMPORTANT)
    res.json({
      ResultCode: 0,
      ResultDesc: "Accepted"
    });
  } catch (err) {
    console.error("❌ CONFIRMATION ERROR:", err.message);
    res.json({ ResultCode: 0, ResultDesc: "Error handled" });
  }
};
