const express = require("express");
require("dotenv").config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

// ===== ENV =====
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const SMART_PAY_BASE = "https://afri-smart-pay-v2.onrender.com";

// DEV funding wallet (MUST EXIST IN DB)
const FUNDING_WALLET = "254700000000";

// ===== HELPERS =====
function normalize(text = "") {
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
    console.error("WhatsApp send error:", await r.text());
  }
}

async function safeJson(res) {
  const t = await res.text();
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

// ===== WEBHOOK VERIFY =====
app.get("/webhook", (req, res) => {
  if (
    req.query["hub.mode"] === "subscribe" &&
    req.query["hub.verify_token"] === VERIFY_TOKEN
  ) {
    return res.status(200).send(req.query["hub.challenge"]);
  }
  res.sendStatus(403);
});

// ===== WEBHOOK RECEIVE =====
app.post("/webhook", async (req, res) => {
  try {
    const msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!msg) return res.sendStatus(200);

    const from = msg.from;
    const text = normalize(msg.text?.body || "");

    console.log("📩 WhatsApp:", from, text);

    let reply =
      "Welcome to Afri Smart 💳\n\nCommands:\n• top up <amount>\n• send <amount> to <phone>";

    // ---- ENSURE USER WALLET ----
    await fetch(`${SMART_PAY_BASE}/api/wallet/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: from }),
    });

    // ===== TOP UP (DEV MODE) =====
    const topup = text.match(/^(top\s?up)\s+(\d+)$/);
    if (topup) {
      const amount = Number(topup[2]);

      const r = await fetch(`${SMART_PAY_BASE}/api/send-money/send-money`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: FUNDING_WALLET,
          to: from,
          amount,
        }),
      });

      const data = await safeJson(r);

      reply = data?.success
        ? `✅ Wallet credited with KES ${amount}`
        : "❌ Top up failed (funding wallet issue)";
    }

    // ===== SEND MONEY =====
    else {
      const send = text.match(/^send\s+(\d+)\s+to\s+(\d+)$/);
      if (send) {
        const amount = Number(send[1]);
        const to = send[2];

        // ensure receiver wallet
        await fetch(`${SMART_PAY_BASE}/api/wallet/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: to }),
        });

        const r = await fetch(`${SMART_PAY_BASE}/api/send-money/send-money`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from,
            to,
            amount,
          }),
        });

        const data = await safeJson(r);

        reply = data?.success
          ? `✅ Sent KES ${amount} to ${to}`
          : "❌ Failed to send money";
      }
    }

    await sendWhatsApp(from, reply);
    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(200);
  }
});

// ===== START =====
app.listen(PORT, () => {
  console.log(`🚀 Afri Smart Connect running on port ${PORT}`);
});
