const https = require("https");

const ACCESS_TOKEN = "UkLIYrW9XF85AAR9fJraHzH6ocNC"; // token you just generated

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
    Authorization: "Bearer " + ACCESS_TOKEN,
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

req.on("error", (err) => {
  console.error("REQUEST ERROR:", err.message);
});

req.write(payload);
req.end();
