const axios = require("axios");

exports.stkPush = async (req, res) => {
  const { phone, amount, accountReference, transactionDesc } = req.body;

  if (!phone || !amount || !accountReference) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    /* =========================
       1. ACCESS TOKEN
    ========================= */
    const auth = Buffer.from(
      `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
    ).toString("base64");

    const tokenRes = await axios.get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`
        }
      }
    );

    const accessToken = tokenRes.data.access_token;

    /* =========================
       2. PASSWORD
    ========================= */
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, "")
      .slice(0, -3);

    const password = Buffer.from(
      process.env.MPESA_SHORTCODE +
        process.env.MPESA_PASSKEY +
        timestamp
    ).toString("base64");

    /* =========================
       3. STK PUSH
    ========================= */
    const payload = {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phone,
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: accountReference,
      TransactionDesc: transactionDesc || "SMART_PAY_STK"
    };

    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    return res.json({
      message: "STK Push sent",
      checkoutRequestID: response.data.CheckoutRequestID
    });
  } catch (err) {
    console.error("STK PUSH ERROR:", err.response?.data || err.message);
    return res.status(500).json({ message: "STK Push failed" });
  }
};
