const express = require("express");
require("dotenv").config();

const app = express();
app.use(express.json());

/* ================= CONFIG ================= */
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "verify_token";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

const SMART_PAY_BASE = "https://afri-smart-pay-v2.onrender.com";

/* ================= HELPERS ================= */
function normalizePhone(phone) {
  return phone.replace(/\+/g, "").trim();
}

async function safeJson(res) {
  if (!res.ok) {
    if (res.status === 429) {
      return { success: false, error: "Too many requests. Please wait a few seconds." };
    }
    const text = await res.text();
    return { success: false, error: text || "Service error" };
  }
  return res.json();
}

/* ================= SMART PAY CLIENT ================= */
async function checkBalance(phone) {
  const res = await fetch(`${SMART_PAY_BASE}/api/check-balance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone })
  });
  return safeJson(res);
}

async function setPin(phone, pin) {
  const res = await fetch(`${SMART_PAY_BASE}/api/set-pin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, pin })
  });
  return safeJson(res);
}

async function sendMoney(from, to, amount, pin) {
  const res = await fetch(`${SMART_PAY_BASE}/api/send-money`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, amount, pin })
  });
  return safeJson(res);
}

/* ================= WHATSAPP SEND ================= */
async function sendWhatsAppMessage(to, text) {
  const url = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;

  await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      text: { body: text }
    })
  });
}

/* ================= MESSAGE LOGIC ================= */
async function handleIncomingText(from, text) {
  const phone = normalizePhone(from);
  const msg = text.trim();

  /* ----- SET PIN ----- */
  const setPinMatch = msg.match(/^setpin\s+(\d{4,6})$/i);
  if (setPinMatch) {
    const pin = setPinMatch[1];
    const result = await setPin(phone, pin);

    if (!result.success) {
      return `❌ ${result.error || "Failed to set PIN"}`;
    }

    return "✅ PIN set successfully.\nUse it when sending money:\nsend 50 to 2547XXXXXXXX pin 1234";
  }

  /* ----- BALANCE ----- */
  if (/^balance$/i.test(msg)) {
    const data = await checkBalance(phone);
    if (!data.success) return `⚠️ ${data.error}`;
    return `💰 Your balance is KES ${data.balance}`;
  }

  /* ----- SEND MONEY (WITH PIN) ----- */
  const sendMatch = msg.match(/send\s+(\d+)\s+to\s+(\+?\d+)\s+pin\s+(\d{4,6})/i);
  if (sendMatch) {
    const amount = Number(sendMatch[1]);
    const to = normalizePhone(sendMatch[2]);
    const pin = sendMatch[3];

    if (!/^2547\d{8}$/.test(to)) {
      return "❌ Invalid phone number. Use format: 2547XXXXXXXX";
    }

    const result = await sendMoney(phone, to, amount, pin);

    if (!result.success) {
      return `❌ ${result.error}`;
    }

    return `✅ Sent KES ${amount} to ${to}\n💰 New balance: KES ${result.balance}`;
  }

  /* ----- HELP ----- */
  return (
    "🤖 Afri Smart Pay Commands\n\n" +
    "• setpin 1234\n" +
    "• balance\n" +
    "• send 50 to 2547XXXXXXXX pin 1234"
  );
}

/* ================= WEBHOOK VERIFY ================= */
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

/* ================= WEBHOOK RECEIVE ================= */
app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (!message || !message.text) return res.sendStatus(200);

    const from = message.from;
    const text = message.text.body;

    console.log("📩 Message:", from, text);

    const reply = await handleIncomingText(from, text);
    await sendWhatsAppMessage(from, reply);

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Webhook error:", err.message);
    res.sendStatus(200);
  }
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🔥 Smart Connect running on port ${PORT}`);
});
