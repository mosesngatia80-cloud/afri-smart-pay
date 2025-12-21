const express = require("express");
require("dotenv").config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const SMART_PAY_BASE = process.env.SMART_PAY_BASE_URL;

// ---------- HELPERS ----------
function normalizeText(text = "") {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

async function sendWhatsApp(to, message) {
  const r = await fetch(
    `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        text: { body: message },
      }),
    }
  );

  if (!r.ok) {
    const t = await r.text();
    console.error("WhatsApp send failed:", t);
  }
}

async function safeJson(res) {
  const t = await res.text();
  try { return JSON.parse(t); } catch { return null; }
}

// ---------- WEBHOOK VERIFY ----------
app.get("/webhook", (req, res) => {
  if (
    req.query["hub.mode"] === "subscribe" &&
    req.query["hub.verify_token"] === VERIFY_TOKEN
  ) {
    return res.status(200).send(req.query["hub.challenge"]);
  }
  res.sendStatus(403);
});

// ---------- WEBHOOK RECEIVE ----------
app.post("/webhook", async (req, res) => {
  try {
    const msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!msg) return res.sendStatus(200);

    const from = msg.from;
    const text = normalizeText(msg.text?.body || "");

    console.log("Incoming:", from, text);

    let reply =
      "Welcome to Afri Smart 💳\n\nCommands:\n• top up <amount>\n• send <amount> to <phone>";

    // ---------- ENSURE WALLET ----------
    await fetch(`${SMART_PAY_BASE}/wallet/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: from }),
    });

    // ---------- TOP UP (SYSTEM CREDIT) ----------
    const topupMatch = text.match(/^(top\s?up)\s+(\d+)$/);
    if (topupMatch) {
      const amount = Number(topupMatch[2]);

      const r = await fetch(`${SMART_PAY_BASE}/send-money`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "SYSTEM",
          to: from,
          amount,
        }),
      });

      const data = await safeJson(r);

      reply = data?.success
        ? `✅ Wallet credited with KES ${amount}`
        : "❌ Top up failed";
    }

    // ---------- SEND MONEY ----------
    else {
      const sendMatch = text.match(/^send\s+(\d+)\s+to\s+(\d+)$/);
      if (sendMatch) {
        const amount = Number(sendMatch[1]);
        const to = sendMatch[2];

        await fetch(`${SMART_PAY_BASE}/wallet/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: to }),
        });

        const r = await fetch(`${SMART_PAY_BASE}/send-money`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from, to, amount }),
        });

        const data = await safeJson(r);

        reply = data?.success
          ? `✅ Sent KES ${amount} to ${to}`
          : "❌ Failed to send money";
      }
    }

    await sendWhatsApp(from, reply);
    res.sendStatus(200);
  } catch (e) {
    console.error("Webhook error:", e);
    res.sendStatus(200);
  }
});

// ---------- START ----------
app.listen(PORT, () => {
  console.log(`🚀 Afri Smart Connect running on port ${PORT}`);
});
