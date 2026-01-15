const fetch = global.fetch;

let accessToken = null;
let tokenExpiry = 0; // timestamp in ms

async function getDarajaToken() {
  const now = Date.now();

  // Use cached token if still valid (1 min buffer)
  if (accessToken && now < tokenExpiry - 60_000) {
    return accessToken;
  }

  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    throw new Error("Missing M-PESA consumer key/secret");
  }

  const auth = Buffer.from(
    `${consumerKey}:${consumerSecret}`
  ).toString("base64");

  const url =
    "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";

  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error("Daraja token generation failed: " + text);
  }

  const data = await res.json();

  accessToken = data.access_token;
  tokenExpiry = now + data.expires_in * 1000;

  console.log("🔐 New Daraja token generated");

  return accessToken;
}

module.exports = { getDarajaToken };
