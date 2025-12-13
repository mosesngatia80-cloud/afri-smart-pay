import express from "express";
import dotenv from "dotenv";
import Wallet from "../models/Wallet.js";

dotenv.config();
const router = express.Router();

// =============================
// PayPal Environment Variables
// =============================
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_MODE = process.env.PAYPAL_MODE || "sandbox";

const BASE_URL =
  PAYPAL_MODE === "live"
    ? "https://api.paypal.com"
    : "https://api.sandbox.paypal.com";

// =============================
// Generate PayPal Access Token
// =============================
async function generateAccessToken() {
  const auth = Buffer.from(
    `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || "PayPal token error");
  return data.access_token;
}

// =============================
// Create PayPal Order
// =============================
router.post("/create-order", async (req, res) => {
  try {
    const accessToken = await generateAccessToken();

    const response = await fetch(`${BASE_URL}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
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

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================
// Capture PayPal Order + Credit Wallet
// =============================
router.post("/capture-order", async (req, res) => {
  try {
    const { orderID, phone } = req.body;
    const accessToken = await generateAccessToken();

    const captureRes = await fetch(
      `${BASE_URL}/v2/checkout/orders/${orderID}/capture`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const paypal = await captureRes.json();

    if (paypal.status !== "COMPLETED") {
      return res.status(400).json({
        error: "Payment not completed",
        paypal,
      });
    }

    const amount = parseFloat(
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
