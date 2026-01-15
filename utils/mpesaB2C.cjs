const fetch = global.fetch;

// 🔑 FIX: correct token provider
const getToken = require("./darajaToken.cjs");

module.exports = async ({
  amount,
  phone,
  remarks,
  occasion
}) => {
  const token = await getToken();

  const response = await fetch(
    "https://api.safaricom.co.ke/mpesa/b2c/v3/paymentrequest",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        InitiatorName: process.env.B2C_INITIATOR,
        SecurityCredential: process.env.B2C_SECURITY_CREDENTIAL,
        CommandID: "BusinessPayment",
        Amount: amount,
        PartyA: process.env.B2C_SHORTCODE,
        PartyB: phone,
        Remarks: remarks,
        QueueTimeOutURL: `${process.env.BASE_URL}/api/c2b/timeout`,
        ResultURL: `${process.env.BASE_URL}/api/c2b/b2c/callback`,
        Occasion: occasion
      })
    }
  );

  return response.json();
};
