const https = require("https");
require("dotenv").config();

const consumerKey = process.env.MPESA_CONSUMER_KEY;
const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

if (!consumerKey || !consumerSecret) {
  console.error("❌ Missing MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET");
  process.exit(1);
}

const auth = Buffer.from(
  consumerKey + ":" + consumerSecret
).toString("base64");

const options = {
  hostname: "api.safaricom.co.ke",
  path: "/oauth/v1/generate?grant_type=client_credentials",
  method: "GET",
  headers: {
    Authorization: "Basic " + auth
  }
};

const req = https.request(options, (res) => {
  let data = "";

  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    console.log("STATUS:", res.statusCode);
    try {
      console.log(JSON.parse(data));
    } catch {
      console.log(data);
    }
  });
});

req.on("error", (err) => {
  console.error("REQUEST ERROR:", err.message);
});

req.end();
