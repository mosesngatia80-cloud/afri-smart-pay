const axios = require("axios");

const SMART_PAY_BASE = process.env.SMART_PAY_BASE;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;

module.exports = async function whatsappHandler(req, res) {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];

    if (!message) return res.sendStatus(200);

    const from = message.from; // e.g. 2547XXXXXXXX
    const text = message.text?.body?.trim().toUpperCase();

    // ================= BALANCE =================
    if (text === "BALANCE") {
      const r = await axios.get(
        `${SMART_PAY_BASE}/check-balance/${from}`
      );

      const reply =
        `Afri Smart Pay\n\nYour wallet balance is KES ${r.data.balance}.`;

      await sendWhatsAppMessage(from, reply);
      return res.sendStatus(200);
    }

    // ================= HISTORY =================
    if (text === "HISTORY") {
      const r = await axios.get(
        `${SMART_PAY_BASE}/transactions/${from}`
      );

      const txs = r.data;

      if (!txs.length) {
        await sendWhatsAppMessage(from, "You have no transactions yet.");
        return res.sendStatus(200);
      }

      let reply = "Afri Smart Pay – Transaction History\n\n";

      txs.slice(0, 5).forEach(tx => {
        const d = new Date(tx.date).toLocaleDateString();
        reply += `${d}: +${tx.amount} KES (${tx.source})\n`;
      });

      await sendWhatsAppMessage(from, reply);
      return res.sendStatus(200);
    }

    // ================= HELP =================
    await sendWhatsAppMessage(
      from,
      "Welcome to Afri Smart Pay.\n\nSend:\nBALANCE – check wallet balance\nHISTORY – view transactions"
    );
    return res.sendStatus(200);

  } catch (error) {
    console.error("❌ WhatsApp handler error:", error.message);
    return res.sendStatus(200);
  }
};

async function sendWhatsAppMessage(to, text) {
  await axios.post(
    `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      text: { body: text }
    },
    {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      }
    }
  );
}
