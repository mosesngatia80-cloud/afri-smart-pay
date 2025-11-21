// ====================================================================
//               AFRI SMART CONNECT - WHATSAPP WEBHOOK
//                     FULL SAFE server.js FILE
// ====================================================================

const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// --------------------------------------------------------------------
// 🔐 VERIFY TOKEN (Used to connect webhook)
// --------------------------------------------------------------------
const VERIFY_TOKEN = "afrismartconnecttoken";

// --------------------------------------------------------------------
// 🔐 WHATSAPP TOKEN (VERY IMPORTANT)
// You will NOT put your token here.
// Instead, you will set WHATSAPP_TOKEN in Termux or Render.
// --------------------------------------------------------------------
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;

// --------------------------------------------------------------------
// 📞 PHONE NUMBER ID (Replace with your real one AFTER paste)
// For now, I set your known ID:
// --------------------------------------------------------------------
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || "902718232914908";


// ====================================================================
// 🌐 WEBHOOK VERIFICATION (GET)
// Meta calls this ONCE to verify your webhook
// ====================================================================
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("🔗 WEBHOOK VERIFIED BY META");
    return res.status(200).send(challenge);
  } else {
    return res.sendStatus(403);
  }
});


// ====================================================================
// 📩 RECEIVE INCOMING MESSAGES (POST)
// ====================================================================
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    if (
      body.object &&
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0].value.messages &&
      body.entry[0].changes[0].value.messages[0]
    ) {
      const message = body.entry[0].changes[0].value.messages[0];
      const from = message.from;
      const text = message.text?.body?.toLowerCase() || "";

      console.log("📥 Message from", from, ":", text);

      // SIMPLE REPLIES
      if (text === "hi") {
        await sendWhatsAppMessage(from, "👋 Hello! Afri Smart Connect is online.");
      } else if (text.includes("wallet")) {
        await sendWhatsAppMessage(from, "💳 Your Afri Smart Wallet is connected.");
      } else if (text.includes("balance")) {
        await sendWhatsAppMessage(from, "🧮 Checking your Afri Smart Pay balance...");
      } else {
        await sendWhatsAppMessage(from, "✔ Message received.");
      }
    }

    res.sendStatus(200);

  } catch (err) {
    console.error("❌ Error in webhook:", err);
    res.sendStatus(500);
  }
});


// ====================================================================
// 📤 SEND WHATSAPP MESSAGE
// ====================================================================
async function sendWhatsAppMessage(to, message) {
  try {
    const url = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;

    await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        to: to,
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("📤 Sent:", message);

  } catch (err) {
    console.error("❌ Error sending message:", err.response?.data || err);
  }
}


// ====================================================================
// 🚀 START SERVER
// ====================================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Afri Smart WhatsApp Webhook running on port ${PORT}`);
});
