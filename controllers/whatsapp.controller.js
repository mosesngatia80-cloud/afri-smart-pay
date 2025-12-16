const axios = require("axios");

const SMART_PAY_BASE = process.env.SMART_PAY_BASE;

module.exports = async function whatsappHandler(req, res) {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];

    if (!message) return res.sendStatus(200);

    const from = message.from; // phone number (2547...)
    const text = message.text?.body?.trim().toUpperCase();

    // HISTORY command
    if (text === "HISTORY") {
      const response = await axios.get(
        `${SMART_PAY_BASE}/transactions/${from}`
      );

      const transactions = response.data;

      if (!transactions.length) {
        return sendWhatsAppMessage(
          from,
          "You have no transactions yet."
        );
      }

      let reply = "Afri Smart Pay – Transaction History\n\n";

      transactions.slice(0, 5).forEach(tx => {
        const date = new Date(tx.date).toLocaleDateString();
        reply += `${date}: +${tx.amount} KES (${tx.source})\n`;
      });

      return sendWhatsAppMessage(from, reply);
    }

    // Default reply
    return sendWhatsAppMessage(
      from,
      "Send BALANCE to check your wallet balance or HISTORY to see transactions."
    );
  } catch (error) {
    console.error("❌ WhatsApp handler error:", error);
    return res.sendStatus(200);
  }
};

// Send WhatsApp message helper
async function sendWhatsAppMessage(to, text) {
  await axios.post(
    `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      text: { body: text }
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      }
    }
  );
}
