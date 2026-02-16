// token-scheduler.cjs
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const TOKEN_FILE = path.join(__dirname, "access-token.json");

function refreshToken() {
  exec("node generate-token-prod.cjs", (err, stdout) => {
    if (err) {
      console.error("❌ Token refresh error:", err);
      return;
    }

    console.log("✅ Token refreshed at", new Date().toISOString());

    try {
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Token JSON not found");

      const tokenData = JSON.parse(jsonMatch[0]);

      fs.writeFileSync(
        TOKEN_FILE,
        JSON.stringify(
          {
            access_token: tokenData.access_token,
            expires_in: tokenData.expires_in,
            refreshed_at: new Date().toISOString()
          },
          null,
          2
        )
      );

      console.log("🔐 Token saved to access-token.json");
    } catch (e) {
      console.error("❌ Failed to save token:", e.message);
    }
  });
}

// 58 minutes
setInterval(refreshToken, 58 * 60 * 1000);

// Run immediately
refreshToken();
