require("dotenv").config();

const auth = Buffer.from(
  `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
).toString("base64");

async function registerC2B() {
  try {
    // 1️⃣ Get access token
    const tokenRes = await fetch(
      "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`
        }
      }
    );

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error("❌ Failed to get access token", tokenData);
      return;
    }

    // 2️⃣ Register URLs using STORE NUMBER
    const res = await fetch(
      "https://api.safaricom.co.ke/mpesa/c2b/v1/registerurl",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ShortCode: "9722720", // STORE NUMBER
          ResponseType: "Completed",
          ConfirmationURL:
            "https://afri-smart-pay-4.onrender.com/api/c2b/confirmation",
          ValidationURL:
            "https://afri-smart-pay-4.onrender.com/api/c2b/validation"
        })
      }
    );

    const data = await res.json();
    console.log("STATUS:", res.status);
    console.log(data);
  } catch (err) {
    console.error("ERROR:", err.message);
  }
}

registerC2B();
