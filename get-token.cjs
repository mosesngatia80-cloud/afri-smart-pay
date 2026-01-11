require("dotenv").config();

const auth = Buffer.from(
  `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
).toString("base64");

async function getToken() {
  try {
    const res = await fetch(
      "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`
        }
      }
    );

    const data = await res.json();
    console.log("STATUS:", res.status);
    console.log(data);
  } catch (err) {
    console.error("ERROR:", err.message);
  }
}

getToken();
