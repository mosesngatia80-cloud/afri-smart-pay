import axios from "axios";

const SMART_PAY_BASE = process.env.SMART_PAY_BASE || "http://localhost:3000/api";

// simple in-memory state (OK for v1 / demo)
const pendingPin = new Map(); // phone -> { action, payload }

export const handleWhatsAppMessage = async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    const msg = value?.messages?.[0];
    if (!msg || msg.type !== "text") return res.sendStatus(200);

    const from = msg.from; // e.g. 2547xxxxxxxx
    const text = msg.text.body.trim().toLowerCase();

    // If waiting for PIN
    if (pendingPin.has(from)) {
      const pin = text;
      const { action, payload } = pendingPin.get(from);
      pendingPin.delete(from);

      if (action === "send") {
        const r = await axios.post(`${SMART_PAY_BASE}/send-money`, {
          fromPhone: from,
          toPhone: payload.to,
          amount: payload.amount,
          pin
        });
        return reply(value.metadata.phone_number_id, from,
          `✅ Sent KES ${payload.amount}. Fee KES ${r.data.fee}.`
        );
      }

      if (action === "withdraw") {
        const r = await axios.post(`${SMART_PAY_BASE}/withdraw`, {
          phone: from,
          amount: payload.amount,
          pin
        });
        return reply(value.metadata.phone_number_id, from,
          `✅ Withdrawn KES ${payload.amount}. Fee KES ${r.data.fee}.`
        );
      }
    }

    // Commands
    if (text === "help") {
      return reply(value.metadata.phone_number_id, from,
        "Commands:\n• balance\n• send 50 2547XXXXXXXX\n• withdraw 50"
      );
    }

    if (text === "balance") {
      const r = await axios.get(`${SMART_PAY_BASE}/check-balance/${from}`);
      return reply(value.metadata.phone_number_id, from,
        `💰 Your balance is KES ${r.data.balance}`
      );
    }

    if (text.startsWith("send ")) {
      const parts = text.split(" ");
      if (parts.length !== 3) {
        return reply(value.metadata.phone_number_id, from,
          "Usage: send <amount> <phone>"
        );
      }
      const amount = Number(parts[1]);
      const to = parts[2];
      pendingPin.set(from, { action: "send", payload: { amount, to } });
      return reply(value.metadata.phone_number_id, from, "🔐 Enter your PIN");
    }

    if (text.startsWith("withdraw ")) {
      const parts = text.split(" ");
      if (parts.length !== 2) {
        return reply(value.metadata.phone_number_id, from,
          "Usage: withdraw <amount>"
        );
      }
      const amount = Number(parts[1]);
      pendingPin.set(from, { action: "withdraw", payload: { amount } });
      return reply(value.metadata.phone_number_id, from, "🔐 Enter your PIN");
    }

    return reply(value.metadata.phone_number_id, from, "Type *help* to see commands");

  } catch (err) {
    console.error("❌ WHATSAPP ERROR:", err.response?.data || err.message);
    return res.sendStatus(200);
  }
};

async function reply(phoneNumberId, to, body) {
  await axios.post(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      text: { body }
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      }
    }
  );
}
