import express from "express";
import Wallet from "../models/Wallet.js";

const router = express.Router();

// =============================
// PAYPAL MODE & CREDENTIALS
// =============================
const PAYPAL_MODE = process.env.PAYPAL_MODE || "sandbox";

const PAYPAL_CLIENT_ID =
  PAYPAL_MODE === "live"
    ? process.env.PAYPAL_LIVE_CLIENT_ID
    : process.env.PAYPAL_SANDBOX_CLIENT_ID;

const PAYPAL_CLIENT_SECRET =
  PAYPAL_MODE === "live"
    ? process.env.PAYPAL_LIVE_CLIENT_SECRET
    : process.env.PAYPAL_SANDBOX_CLIENT_SECRET;

const BASE_URL =
  PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

// =============================
// ACCESS TOKEN
// =============================
async function getAccessToken() {
  const auth = Buffer.from(
    `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await res.json();
  if (!res.ok) throw new Error("Failed to get PayPal token");
  return data.access_token;
}

// =============================
// CREATE PAYPAL TOP-UP ORDER
// =============================
router.post("/create", async (req, res) => {
  try {
    const token = await getAccessToken();

    const response = await fetch(`${BASE_URL}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: { currency_code: "USD", value: "10.00" },
          },
        ],
      }),
    });

    const order = await response.json();
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================
// CAPTURE PAYPAL TOP-UP
// =============================
router.post("/capture", async (req, res) => {
  try {
    const { orderID, phone } = req.body;
    const token = await getAccessToken();

    const response = await fetch(
      `${BASE_URL}/v2/checkout/orders/${orderID}/capture`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const paypal = await response.json();

    if (paypal.status !== "COMPLETED") {
      return res.status(400).json({ error: "Payment not completed", paypal });
    }

    const amount = Number(
      paypal.purchase_units[0].payments.captures[0].amount.value
    );

    const wallet = await Wallet.findOne({ phone });
    if (!wallet) return res.status(404).json({ error: "Wallet not found" });

    wallet.balance += amount;
    wallet.transactions.push({
      type: "paypal-topup",
      amount,
      date: new Date(),
    });

    await wallet.save();

    res.json({
      message: "Wallet credited successfully",
      newBalance: wallet.balance,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
