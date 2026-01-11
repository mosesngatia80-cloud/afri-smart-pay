const https = require("https");
require("dotenv").config();

// 🔐 Step 1: get OAuth token
function getToken(callback) {
  const auth = Buffer.from(
    process.env.MPESA_CONSUMER_KEY + ":" + process.env.MPESA_CONSUMER_SECRET
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
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => {
      const json = JSON.parse(data);
      callback(json.access_token);
    });
  });

  req.on("error", console.error);
  req.end();
}

// 🔁 Step 2: register C2B URLs
function registerC2B(token) {
  const payload = JSON.stringify({
    ShortCode: "9722720",   // STORE NUMBER
    ResponseType: "Completed",
    ConfirmationURL: "https://afri-smart-pay-4.onrender.com/api/c2b/confirmation",
    ValidationURL: "https://afri-smart-pay-4.onrender.com/api/c2b/validation"
  });

  const options = {
    hostname: "api.safaricom.co.ke",
    path: "/mpesa/c2b/v1/registerurl",
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload)
    }
  };

  const req = https.request(options, (res) => {
    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => {
      console.log("STATUS:", res.statusCode);
      console.log(data);
    });
  });

  req.on("error", console.error);
  req.write(payload);
  req.end();
}

// ▶️ Execute
getToken(registerC2B);
