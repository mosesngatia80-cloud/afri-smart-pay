const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(bodyParser.json());
app.use(cors());

const VERIFY_TOKEN = "smartconnecttoken";

// ===============================
// VERIFY WEBHOOK
// ===============================
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    console.log("Webhook Verified");
    return res.status(200).send(challenge);
  } else {
    return res.sendStatus(403);
  }
});

// ===============================
// WHATSAPP SEND MESSAGE FUNCTION
// ===============================
async function sendWhatsApp(to, message) {
  try {
    await axios.post(
      `https://graph.facebook.com/v20.0/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: to,
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Message sent:", message);
  } catch (err) {
    console.log("WhatsApp send error:", err.response?.data || err.message);
  }
}

// ===============================
// SESSIONS FOR FLOWS
// ===============================
let sessions = {}; // store steps for each user

// ===============================
// WEBHOOK RECEIVER
// ===============================
app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];

    if (!message) return res.sendStatus(200);

    const from = message.from;
    const userMsg = message.text?.body?.trim().toLowerCase() || "";

    console.log("Message received:", userMsg);

    // CONTINUE FLOW IF USER IS IN A SESSION
    if (sessions[from]) {
      return handleFlow(from, userMsg, res);
    }

    // MAIN MENU
    if (userMsg === "menu") {
      sendWhatsApp(
        from,
        "💳 *SMART PAY MENU*\n\n1️⃣ Send Money\n2️⃣ Check Balance\n3️⃣ Top Up\n4️⃣ Transaction History\n\nReply with a number."
      );
      return res.sendStatus(200);
    }

    // START SEND MONEY FLOW
    if (userMsg === "1" || userMsg === "send money") {
      sessions[from] = { step: 1 };
      sendWhatsApp(from, "Enter receiver phone number:");
      return res.sendStatus(200);
    }

    // CHECK BALANCE
    if (userMsg === "2") {
      try {
        const r = await axios.get(
          `https://afri-smart-pay-v2.onrender.com/api/check-balance/${from}`
        );
        sendWhatsApp(from, `Your balance is: KES ${r.data.balance}`);
      } catch {
        sendWhatsApp(from, "Error checking balance.");
      }
      return res.sendStatus(200);
    }

    // TOP UP
    if (userMsg === "3") {
      sendWhatsApp(from, "Top-up coming soon.");
      return res.sendStatus(200);
    }

    // HISTORY
    if (userMsg === "4") {
      try {
        const r = await axios.get(
          `https://afri-smart-pay-v2.onrender.com/api/transaction-history/${from}`
        );
        if (!r.data.transactions.length)
          sendWhatsApp(from, "No transactions found.");
        else
          sendWhatsApp(
            from,
            `📜 Your history:\n\n${r.data.transactions
              .map(
                (t) =>
                  `${t.type.toUpperCase()} KES ${t.amount} — ${new Date(
                    t.date
                  ).toLocaleString()}`
              )
              .join("\n")}`
          );
      } catch {
        sendWhatsApp(from, "Error loading history.");
      }
      return res.sendStatus(200);
    }

    // DEFAULT REPLY
    sendWhatsApp(
      from,
      "Welcome to Smart Pay 🚀\nType *menu* to see actions."
    );
    res.sendStatus(200);
  } catch (err) {
    console.log("Webhook error:", err.message);
    res.sendStatus(500);
  }
});

// ===============================
// SEND MONEY FLOW HANDLER
// ===============================
async function handleFlow(from, msg) {
  const session = sessions[from];

  // Step 1 → ask receiver
  if (session.step === 1) {
    session.receiver = msg;
    session.step = 2;
    sendWhatsApp(from, "Enter amount:");
    return;
  }

  // Step 2 → ask amount
  if (session.step === 2) {
    if (isNaN(msg)) {
      sendWhatsApp(from, "Amount must be a number. Try again:");
      return;
    }
    session.amount = msg;
    session.step = 3;
    sendWhatsApp(from, "Enter your PIN:");
    return;
  }

  // Step 3 → enter PIN → process transaction
  if (session.step === 3) {
    session.pin = msg;

    try {
      const response = await axios.post(
        "https://afri-smart-pay-v2.onrender.com/api/send-money",
        {
          sender: from,
          receiver: session.receiver,
          amount: Number(session.amount),
          pin: session.pin,
        }
      );

      sendWhatsApp(from, response.data.message || "Transaction complete.");

      console.log("SEND-MONEY RESPONSE:", response.data);
    } catch (err) {
      sendWhatsApp(from, "❌ Transaction failed. Try again.");
      console.log("Send money error:", err.response?.data || err.message);
    }

    delete sessions[from];
  }
}

// ===============================
// RUN SERVER
// ===============================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🔥 Smart Connect running on port ${PORT}`);
});
