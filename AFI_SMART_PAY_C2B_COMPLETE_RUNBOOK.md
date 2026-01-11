# Afri Smart Pay – COMPLETE C2B PRODUCTION RUNBOOK
This file documents EVERYTHING needed to set up, debug, and verify
M-PESA C2B (Buy Goods) in production using Daraja.

--------------------------------------------------
SECTION 1: BASIC SETUP
--------------------------------------------------

Environment:
- Platform: Termux (Android)
- Backend: Node.js (Express)
- Hosting: Render
- Database: MongoDB Atlas
- Payment: Safaricom M-PESA Daraja (C2B Buy Goods)

Clone project:
git clone https://github.com/mosesngatia80-cloud/afri-smart-pay.git
cd afri-smart-pay
npm install

--------------------------------------------------
SECTION 2: ENVIRONMENT VARIABLES (.env)
--------------------------------------------------

Your .env file MUST contain:

PORT=3000
MONGO_URI=<your_mongodb_uri>

MPESA_CONSUMER_KEY=<production_consumer_key>
MPESA_CONSUMER_SECRET=<production_consumer_secret>

Load variables into shell:
export $(grep -v '^#' .env | xargs)

Verify:
env | grep MPESA

--------------------------------------------------
SECTION 3: GENERATE PRODUCTION OAUTH TOKEN
--------------------------------------------------

File: generate-token-prod.cjs

require("dotenv").config();
const https = require("https");

const auth = Buffer.from(
  `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
).toString("base64");

const options = {
  hostname: "api.safaricom.co.ke",
  path: "/oauth/v1/generate?grant_type=client_credentials",
  method: "GET",
  headers: { Authorization: `Basic ${auth}` }
};

https.request(options, (res) => {
  let data = "";
  res.on("data", d => data += d);
  res.on("end", () => {
    console.log("STATUS:", res.statusCode);
    console.log(data);
  });
}).end();

Run:
node generate-token-prod.cjs

Export token immediately:
export ACCESS_TOKEN=<token_from_output>

--------------------------------------------------
SECTION 4: REGISTER C2B URLS (STORE NUMBER)
--------------------------------------------------

IMPORTANT:
- Buy Goods uses STORE NUMBER
- Store Number = 9722720

File: register-c2b-v2.cjs

const https = require("https");

const payload = JSON.stringify({
  ShortCode: "9722720",
  ResponseType: "Completed",
  ConfirmationURL: "https://afri-smart-pay-4.onrender.com/api/c2b/confirmation",
  ValidationURL: "https://afri-smart-pay-4.onrender.com/api/c2b/validation"
});

const options = {
  hostname: "api.safaricom.co.ke",
  path: "/mpesa/c2b/v2/registerurl",
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload)
  }
};

const req = https.request(options, (res) => {
  let data = "";
  res.on("data", d => data += d);
  res.on("end", () => {
    console.log("STATUS:", res.statusCode);
    console.log(data);
  });
});

req.write(payload);
req.end();

Run:
node register-c2b-v2.cjs

Expected:
STATUS 200
ResponseDescription: Success

--------------------------------------------------
SECTION 5: BACKEND CALLBACK HANDLERS
--------------------------------------------------

server.cjs must contain:

POST /api/c2b/validation
- Always accept request

POST /api/c2b/confirmation
- Log callback
- Credit wallet
- Respond with ResultCode 0

Example:

app.post("/api/c2b/validation", (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

app.post("/api/c2b/confirmation", async (req, res) => {
  console.log("C2B CONFIRMATION:", req.body);

  const amount = Number(req.body.TransAmount);

  // Temporary mapping
  const owner = "254706017295";

  let wallet = await Wallet.findOne({ owner });
  if (!wallet) wallet = await Wallet.create({ owner, balance: 0 });

  wallet.balance += amount;
  await wallet.save();

  res.json({ ResultCode: 0, ResultDesc: "Success" });
});

--------------------------------------------------
SECTION 6: DEPLOYMENT
--------------------------------------------------

git add .
git commit -m "Enable C2B production callbacks"
git push

Render auto-deploys.

Health check:
curl https://afri-smart-pay-4.onrender.com/api/health

--------------------------------------------------
SECTION 7: LIVE VERIFICATION
--------------------------------------------------

1. Send money to Buy Goods Till
2. Check Render logs:
   - Should see C2B CONFIRMATION
3. Check wallet:
curl https://afri-smart-pay-4.onrender.com/api/wallet/254706017295

--------------------------------------------------
SECTION 8: IMPORTANT NOTES
--------------------------------------------------

- MSISDN is masked (hashed) by Safaricom
- Do NOT rely on MSISDN for user mapping
- Use BillRefNumber in production
- Use TransID for idempotency

--------------------------------------------------
FINAL STATUS
--------------------------------------------------

If callbacks arrive and wallet updates:
C2B IS FULLY LIVE ✅
