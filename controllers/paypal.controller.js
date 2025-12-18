const fetch = require("node-fetch");

const PAYPAL_BASE =
  process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

const CLIENT_ID =
  process.env.PAYPAL_MODE === "live"
    ? process.env.PAYPAL_LIVE_CLIENT_ID
    : process.env.PAYPAL_SANDBOX_CLIENT_ID;

const CLIENT_SECRET =
  process.env.PAYPAL_MODE === "live"
    ? process.env.PAYPAL_LIVE_CLIENT_SECRET
    : process.env.PAYPAL_SANDBOX_CLIENT_SECRET;

async function getAccessToken() {
  const auth = Buffer.from(
    `${CLIENT_ID}:${CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await res.json();
  return data.access_token;
}

exports.createPaypalOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount) {
      return res.status(400).json({ message: "Amount required" });
    }

    const token = await getAccessToken();

    const response = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: amount.toString(),
            },
          },
        ],
      }),
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("PayPal create error:", err);
    res.status(500).json({ message: "PayPal create failed" });
  }
};

exports.capturePaypalOrder = async (req, res) => {
  try {
    const { orderID } = req.body;
    if (!orderID) {
      return res.status(400).json({ message: "orderID required" });
    }

    const token = await getAccessToken();

    const response = await fetch(
      `${PAYPAL_BASE}/v2/checkout/orders/${orderID}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("PayPal capture error:", err);
    res.status(500).json({ message: "PayPal capture failed" });
  }
};
