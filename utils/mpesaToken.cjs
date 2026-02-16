// utils/mpesaToken.cjs
const fs = require("fs");
const path = require("path");

const TOKEN_FILE = path.join(__dirname, "../access-token.json");

function getAccessToken() {
  try {
    const raw = fs.readFileSync(TOKEN_FILE, "utf8");
    const data = JSON.parse(raw);

    if (!data.access_token) {
      throw new Error("access_token missing");
    }

    return data.access_token;
  } catch (err) {
    console.error("❌ Failed to load M-PESA token:", err.message);
    return null;
  }
}

module.exports = { getAccessToken };
