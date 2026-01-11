require("dotenv").config();
const https = require("https");

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error("❌ ACCESS_TOKEN not set");
  process.exit(1);
}

// ✅ USE STORE NUMBER
const payload = JSON.stringify({
  ShortCode: "9722720",
  ResponseType: "Completed",
  ConfirmationURL: "https://afri-smart-pay-4.onrender.com/api/c2b/confirmation",
  ValidationURL: "https://afri-smart-pay-4.onrender.com/api/c2b/validation"
});

const options = {
  hostname: "api.safaricom.co.ke",
  path: "/mpesa/c2b/v1/registerurl",
  method: "POST",
  headers: {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload)
  }
};

const req = https.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    console.log("STATUS:", res.statusCode);
    console.log(data || "(empty)");
  });
});

req.on("error", (err) => {
  console.error("REQUEST ERROR:", err.message);
});

req.write(payload);
req.end();
