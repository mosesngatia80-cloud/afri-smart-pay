require("dotenv").config();
const https = require("https");

if (!process.env.MPESA_CONSUMER_KEY || !process.env.MPESA_CONSUMER_SECRET) {
  console.error("❌ Missing MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET");
  process.exit(1);
}

const auth = Buffer.from(
  `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
).toString("base64");

const options = {
  hostname: "api.safaricom.co.ke",
  path: "/oauth/v1/generate?grant_type=client_credentials",
  method: "GET",
  headers: {
    Authorization: `Basic ${auth}`
  }
};

const req = https.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    console.log("STATUS:", res.statusCode);
    console.log(data || "(empty body)");
  });
});

req.on("error", (err) => {
  console.error("REQUEST ERROR:", err.message);
});

req.end();
